import { SimpleGit, simpleGit } from 'simple-git'
import { pathUrlToPath, Payload } from './content.js'
import { Octokit } from '@octokit/action'
import { Options } from './options.js'

/**
 * Interface for environment variable access to enable dependency injection
 */
export interface EnvironmentReader {
  getGitHubRepository(): string | undefined
}

/**
 * Interface for Git operations to enable dependency injection and mocking
 */
export interface GitOperations {
  addConfig(key: string, value: string): Promise<void>
  hasChanges(): Promise<boolean>
  add(files: string): Promise<void>
  commit(message: string): Promise<void>
  push(): Promise<void>
  checkoutLocalBranch(branchName: string): Promise<void>
}

/**
 * Interface for GitHub API operations to enable dependency injection and mocking
 */
export interface GitHubOperations {
  getRepository(
    owner: string,
    repo: string
  ): Promise<{ default_branch: string }>
  createPullRequest(params: {
    owner: string
    repo: string
    title: string
    head: string
    base: string
  }): Promise<void>
}

/**
 * Git service configuration
 */
export interface GitServiceConfig {
  gitOps: GitOperations
  githubOps: GitHubOperations
  envReader: EnvironmentReader
}

/**
 * Default implementation reading from process.env
 */
export const createProcessEnvironmentReader = (): EnvironmentReader => ({
  getGitHubRepository: () => process.env.GITHUB_REPOSITORY
})

/**
 * Creates Git operations wrapper for SimpleGit
 */
export const createSimpleGitOperations = (
  git: SimpleGit = simpleGit()
): GitOperations => ({
  addConfig: async (key: string, value: string) => {
    await git.addConfig(key, value)
  },
  hasChanges: async () => {
    return !(await git.status()).isClean()
  },
  add: async (files: string) => {
    await git.add(files)
  },
  commit: async (message: string) => {
    await git.commit(message)
  },
  push: async () => {
    await git.push()
  },
  checkoutLocalBranch: async (branchName: string) => {
    await git.checkoutLocalBranch(branchName)
  }
})

/**
 * Creates GitHub operations wrapper for Octokit
 */
export const createOctokitOperations = (
  octokit: Octokit = new Octokit()
): GitHubOperations => ({
  getRepository: async (owner: string, repo: string) => {
    const { data: repository } = await octokit.rest.repos.get({
      owner,
      repo
    })
    return { default_branch: repository.default_branch }
  },
  createPullRequest: async (params) => {
    await octokit.rest.pulls.create(params)
  }
})

/**
 * Creates default git service configuration
 */
export const createDefaultGitServiceConfig = (): GitServiceConfig => ({
  gitOps: createSimpleGitOperations(),
  githubOps: createOctokitOperations(),
  envReader: createProcessEnvironmentReader()
})

/**
 * Sets up git account configuration
 */
export const setupGitAccount = async (gitOps: GitOperations): Promise<void> => {
  await gitOps.addConfig('user.name', 'GitHub Action')
  await gitOps.addConfig('user.email', 'action@github.com')
}

/**
 * Commits and pushes changes
 * @param gitOps - Git operations interface
 * @param payload - The payload containing module information
 */
export const pushChanges = async (
  gitOps: GitOperations,
  payload: Payload
): Promise<void> => {
  await gitOps.add('.')
  await gitOps.commit(
    `Update ${pathUrlToPath(payload.goModInfo.Module.Path)} files`
  )
  await gitOps.push()
}

/**
 * Creates and switches to a new branch
 * @param gitOps - Git operations interface
 * @param branchName - Name of the new branch
 */
export const switchNewBranch = async (
  gitOps: GitOperations,
  branchName: string
): Promise<void> => {
  await gitOps.checkoutLocalBranch(branchName)
}

/**
 * Creates a pull request
 * @param githubOps - GitHub operations interface
 * @param envReader - Environment reader interface
 * @param branchName - The branch name to create PR from
 */
export const createPullRequest = async (
  githubOps: GitHubOperations,
  envReader: EnvironmentReader,
  branchName: string
): Promise<void> => {
  const githubRepo = envReader.getGitHubRepository()
  if (!githubRepo) {
    throw new Error('GITHUB_REPOSITORY environment variable not found')
  }

  const [owner, repo] = githubRepo.split('/')
  if (!owner || !repo) {
    throw new Error('Invalid GITHUB_REPOSITORY format. Expected: owner/repo')
  }

  const repository = await githubOps.getRepository(owner, repo)

  await githubOps.createPullRequest({
    owner,
    repo,
    title: 'Update Go Import Redirect Files',
    head: branchName,
    base: repository.default_branch
  })
}

/**
 * Generates a unique branch name
 * @param timestamp - Optional timestamp for testing (defaults to current time)
 */
export const generateBranchName = (timestamp: number = Date.now()): string => {
  return `update-import-paths-${timestamp}`
}

/**
 * Updates the repository with changes, optionally creating a PR
 * @param option - Configuration options
 * @param payload - The payload containing changes
 * @param config - Git service configuration (for dependency injection)
 */
export const updateRepo = async (
  option: Options,
  payload: Payload,
  config: GitServiceConfig = createDefaultGitServiceConfig()
): Promise<void> => {
  if (!(await config.gitOps.hasChanges())) {
    return
  }

  await setupGitAccount(config.gitOps)

  const branchName = generateBranchName()

  if (option.changeType === 'pr') {
    await switchNewBranch(config.gitOps, branchName)
  }

  await pushChanges(config.gitOps, payload)

  if (option.changeType === 'pr') {
    await createPullRequest(config.githubOps, config.envReader, branchName)
  }
}
