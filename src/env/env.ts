/**
 * Interface for environment variable access to enable dependency injection
 */
export interface EnvironmentReader {
  getGitHubRepository(): string | undefined
}

/**
 * Default implementation reading from process.env
 */
export const createProcessEnvironmentReader = (): EnvironmentReader => ({
  getGitHubRepository: () => process.env.GITHUB_REPOSITORY
})
