import path from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { JSDOM } from 'jsdom'
import type { Payload } from './content.js'
import type { Options } from './options.js'
import { z } from 'zod'
/**
 * Interface for file system operations to enable dependency injection for testing
 */
export interface FileSystemWriter {
  writeFile(filePath: string, content: string): void
  createDirectory(dirPath: string): void
}

/**
 * Default implementation using Node.js fs module
 */
export class NodeFileSystemWriter implements FileSystemWriter {
  writeFile(filePath: string, content: string): void {
    writeFileSync(filePath, content, {
      encoding: 'utf8',
      mode: 0o644
    })
  }

  createDirectory(dirPath: string): void {
    mkdirSync(dirPath, { recursive: true, mode: 0o755 })
  }
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
 * Validates template configuration
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateTemplateConfig(config: TemplateConfig): TemplateConfig {
  const result = TemplateConfigSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid template config: ${result.error}`)
  }
  return result.data
}

/**
 * Generates HTML template for Go custom import path
 * @param config - Template configuration
 * @returns Generated HTML string
 */
export function generateTemplate(config: TemplateConfig): JSDOM {
  const validConfig = validateTemplateConfig(config)
  const { importPrefix, owner, repoName } = validConfig

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

/**
 * Generates file paths for a given import suffix
 * @param options - Application options
 * @param importSuffix - Import suffix path
 * @returns Object containing directory and file paths
 */
export function generateFilePaths(
  options: Options,
  importPrefixPath: string,
  importSuffix: string
): { directoryPath: string; filePath: string } {
  const directoryPath = path
    .join('.', options.pagesDir, importPrefixPath, importSuffix)
    .normalize()
  const filePath = path.join(directoryPath, 'index.html').normalize()

  return { directoryPath, filePath }
}

/**
 * Saves an HTML file for a given import suffix
 * @param payload - Payload containing repository and module information
 * @param options - Application options
 * @param importSuffix - Import suffix to generate file for
 * @param fileSystemWriter - File system writer implementation (defaults to NodeFileSystemWriter)
 */
export function saveFile(
  payload: Payload,
  options: Options,
  importPrefixPath: string,
  importSuffix: string,
  fileSystemWriter: FileSystemWriter = new NodeFileSystemWriter()
): void {
  const { directoryPath, filePath } = generateFilePaths(
    options,
    importPrefixPath,
    importSuffix
  )

  // Create directory recursively if it doesn't exist
  fileSystemWriter.createDirectory(directoryPath)

  // Generate the HTML content
  const templateConfig: TemplateConfig = {
    importPrefix: payload.goModInfo.Module.Path,
    owner: payload.owner,
    repoName: payload.repoName
  }

  const htmlContent = generateTemplate(templateConfig)

  // Write the HTML content to the file
  fileSystemWriter.writeFile(filePath, htmlContent.serialize())
}
