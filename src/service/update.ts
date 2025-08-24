import { Fs as FsOperations } from '../fs/fs.js'
import { GoModInfo, GoModInfoSchema } from '../go/mod.js'
import path from 'path'
import { JSDOM } from 'jsdom'
import { z } from 'zod'
import { GitOperations } from '../git/git.js'
import { GitHubOperations } from '../github/github.js'
import { EnvironmentReader } from '../env/env.js'

export const PayloadSchema = z.object({
  owner: z.string().min(1),
  repoName: z.string().min(1),
  goModInfo: GoModInfoSchema
})

export type Payload = z.infer<typeof PayloadSchema>

type UpdateParams = {
  payload: Payload
  pagesDir: string
  changeType: string
}

export async function update(
  params: UpdateParams,
  env: EnvironmentReader,
  fs: FsOperations,
  git: GitOperations,
  github: GitHubOperations
) {
  const currentRepo = env.getGitHubRepository()
  if (!currentRepo) {
    throw new Error('Current repository not found')
  }

  const [currentOwner, currentRepoName] = currentRepo.split('/')

  const suffixes = makeImportSuffixList(params.payload.goModInfo)
  suffixes.push('')
  const importPrefixPath = pathUrlToPath(params.payload.goModInfo.Module.Path)

  const content = generateTemplate({
    importPrefix: params.payload.goModInfo.Module.Path,
    owner: params.payload.owner,
    repoName: params.payload.repoName
  })

  await Promise.all(
    suffixes.map(async (suffix) => {
      const filePath = path
        .join('.', params.pagesDir, importPrefixPath, suffix, 'index.html')
        .normalize()
      await fs.saveFile(filePath, content.serialize())
    })
  )

  if (!(await git.checkDiff())) {
    return
  }

  const newBranchname = `update-redirect-files-${new Date().getTime()}`
  await git.setupAccount()
  if (params.changeType === 'pr') {
    await git.switchNewBranch(newBranchname)
  }
  await git.commitAllChanges(`Update redirect files`)
  await git.pushChanges()

  if (params.changeType === 'pr') {
    const repo = await github.getRepository(currentOwner, currentRepoName)
    await github.createPullRequest({
      head: newBranchname,
      base: repo.default_branch,
      title: `Update redirect files ${importPrefixPath}`,
      owner: currentOwner,
      repo: currentRepoName
    })
  }
}

/**
 * Extracts import suffixes from go module info that match the module path
 * @param goModInfo - The go module information
 * @returns Array of import suffixes (paths relative to the module root)
 */
export function makeImportSuffixList(goModInfo: GoModInfo): string[] {
  if (!goModInfo.Module.Path) {
    return []
  }

  function checkPrefixUrl(
    targetPathStr: string,
    prefixPathStr: string
  ): boolean {
    const targetUrl = URL.parse('http://' + targetPathStr)
    const prefixUrl = URL.parse('http://' + prefixPathStr)

    if (!targetUrl || !prefixUrl) {
      return false
    }

    if (targetUrl.hostname !== prefixUrl.hostname) {
      return false
    }

    const normalizedTargetUrlPath = path.normalize(targetUrl.pathname)
    const normalizedPrefixUrlPath = path.normalize(prefixUrl.pathname)

    if (normalizedPrefixUrlPath === '/') {
      // Normalize URLs by removing trailing slashes
      // If prefix is empty, URL is always under it
      return true
    }

    // Check if URL starts with prefix followed by '/' or is exactly equal
    return (
      normalizedTargetUrlPath === normalizedPrefixUrlPath ||
      normalizedTargetUrlPath.startsWith(normalizedPrefixUrlPath + '/')
    )
  }

  return goModInfo.Imports.filter((imp) =>
    checkPrefixUrl(imp, goModInfo.Module.Path)
  )
    .map((imp) => imp.replace(goModInfo.Module.Path, '').replace(/^\//, ''))
    .filter((suffix) => suffix.length > 0) // Remove empty suffixes
}

// example.com/abc/def -> /abc/def
export function pathUrlToPath(modPath: string): string {
  return URL.parse('http://' + modPath)?.pathname || ''
}

export const TemplateConfigSchema = z.object({
  importPrefix: z.string().min(1).trim(),
  owner: z.string().min(1).trim(),
  repoName: z.string().min(1).trim()
})

/**
 * Configuration for HTML template generation
 */
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>

/**
 * Generates HTML template for Go custom import path
 * @param config - Template configuration
 * @returns Generated HTML string
 */
export function generateTemplate(config: TemplateConfig): JSDOM {
  const { importPrefix, owner, repoName } = config

  // Create a new DOM document
  const dom = new JSDOM('<!DOCTYPE html>')
  const document = dom.window.document

  const head = document.head

  // Create charset meta tag
  const charsetMeta = document.createElement('meta')
  charsetMeta.setAttribute('charset', 'utf-8')
  head.appendChild(charsetMeta)

  // Create go-import meta tag
  const goImportMeta = document.createElement('meta')
  goImportMeta.setAttribute('name', 'go-import')
  goImportMeta.setAttribute(
    'content',
    `${importPrefix} git https://github.com/${owner}/${repoName}.git`
  )
  head.appendChild(goImportMeta)

  // Create refresh meta tag
  const refreshMeta = document.createElement('meta')
  refreshMeta.setAttribute('http-equiv', 'refresh')
  refreshMeta.setAttribute(
    'content',
    `0; url=https://pkg.go.dev/${importPrefix}`
  )
  head.appendChild(refreshMeta)

  const body = document.body

  // Create text node for "Redirecting to "
  const redirectText = document.createTextNode('Redirecting to ')
  body.appendChild(redirectText)

  // Create anchor element
  const anchor = document.createElement('a')
  anchor.setAttribute('href', `https://pkg.go.dev/${importPrefix}`)
  anchor.textContent = `https://pkg.go.dev/${importPrefix}`
  body.appendChild(anchor)

  // Create text node for "..."
  const ellipsisText = document.createTextNode('...')
  body.appendChild(ellipsisText)

  // Return the complete HTML as string
  return dom
}
