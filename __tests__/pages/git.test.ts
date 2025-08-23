import {
  setupGitAccount,
  pushChanges,
  switchNewBranch,
  createPullRequest,
  generateBranchName,
  updateRepo,
  createProcessEnvironmentReader,
  createDefaultGitServiceConfig,
  GitOperations,
  GitHubOperations,
  EnvironmentReader
} from '../../src/update/git.js'
import { Options } from '../../src/update/options.js'
import { Payload } from '../../src/update/content.js'

// Mock implementations for functional testing
const createMockGitOperations = (
  hasChanges: boolean
): GitOperations & {
  getConfigs: () => Map<string, string>
  getAddedFiles: () => string[]
  getCommits: () => string[]
  isPushCalled: () => boolean
  getBranches: () => string[]
} => {
  const configs = new Map<string, string>()
  const addedFiles: string[] = []
  const commits: string[] = []
  let pushCalled = false
  const branches: string[] = []

  return {
    hasChanges: async () => {
      return hasChanges
    },
    addConfig: async (key: string, value: string) => {
      configs.set(key, value)
    },
    add: async (files: string) => {
      addedFiles.push(files)
    },
    commit: async (message: string) => {
      commits.push(message)
    },
    push: async () => {
      pushCalled = true
    },
    checkoutLocalBranch: async (branchName: string) => {
      branches.push(branchName)
    },
    // Test helpers
    getConfigs: () => configs,
    getAddedFiles: () => addedFiles,
    getCommits: () => commits,
    isPushCalled: () => pushCalled,
    getBranches: () => branches
  }
}

const createMockGitHubOperations = (): GitHubOperations & {
  setRepository: (owner: string, repo: string, defaultBranch: string) => void
  getPullRequests: () => Array<{
    owner: string
    repo: string
    title: string
    head: string
    base: string
  }>
} => {
  const repositories = new Map<string, { default_branch: string }>()
  const pullRequests: Array<{
    owner: string
    repo: string
    title: string
    head: string
    base: string
  }> = []

  return {
    getRepository: async (owner: string, repo: string) => {
      const repoKey = `${owner}/${repo}`
      const repository = repositories.get(repoKey)
      if (!repository) {
        throw new Error(`Repository ${repoKey} not found`)
      }
      return repository
    },
    createPullRequest: async (params) => {
      pullRequests.push(params)
    },
    // Test helpers
    setRepository: (owner: string, repo: string, defaultBranch: string) => {
      repositories.set(`${owner}/${repo}`, { default_branch: defaultBranch })
    },
    getPullRequests: () => pullRequests
  }
}

const createMockEnvironmentReader = (
  githubRepository?: string
): EnvironmentReader => ({
  getGitHubRepository: () => githubRepository
})

describe('Git Operations', () => {
  const mockPayload: Payload = {
    owner: 'test-owner',
    repoName: 'test-repo',
    goModInfo: {
      Module: {
        Path: 'example.com/test/module'
      },
      Imports: ['example.com/test/module/pkg']
    }
  }

  describe('setupGitAccount', () => {
    it('should configure git user name and email', async () => {
      const mockGitOps = createMockGitOperations(true)

      await setupGitAccount(mockGitOps)

      expect(mockGitOps.getConfigs().get('user.name')).toBe('GitHub Action')
      expect(mockGitOps.getConfigs().get('user.email')).toBe(
        'action@github.com'
      )
    })
  })

  describe('pushChanges', () => {
    it('should add files, commit with correct message, and push', async () => {
      const mockGitOps = createMockGitOperations(true)

      await pushChanges(mockGitOps, mockPayload)

      expect(mockGitOps.getAddedFiles()).toEqual(['.'])
      expect(mockGitOps.getCommits()).toEqual(['Update /test/module files'])
      expect(mockGitOps.isPushCalled()).toBe(true)
    })
  })

  describe('switchNewBranch', () => {
    it('should checkout a new local branch', async () => {
      const mockGitOps = createMockGitOperations(true)
      const branchName = 'test-branch'

      await switchNewBranch(mockGitOps, branchName)

      expect(mockGitOps.getBranches()).toEqual([branchName])
    })
  })

  describe('createPullRequest', () => {
    it('should create a pull request with correct parameters', async () => {
      const mockGitHubOps = createMockGitHubOperations()
      const mockEnvReader = createMockEnvironmentReader('test-owner/test-repo')
      mockGitHubOps.setRepository('test-owner', 'test-repo', 'main')

      const branchName = 'test-branch'
      await createPullRequest(mockGitHubOps, mockEnvReader, branchName)

      const pullRequests = mockGitHubOps.getPullRequests()
      expect(pullRequests).toHaveLength(1)
      expect(pullRequests[0]).toEqual({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Update Go Import Redirect Files',
        head: branchName,
        base: 'main'
      })
    })

    it('should throw error when GITHUB_REPOSITORY is not set', async () => {
      const mockGitHubOps = createMockGitHubOperations()
      const mockEnvReader = createMockEnvironmentReader()

      await expect(
        createPullRequest(mockGitHubOps, mockEnvReader, 'test-branch')
      ).rejects.toThrow('GITHUB_REPOSITORY environment variable not found')
    })

    it('should throw error when GITHUB_REPOSITORY has invalid format', async () => {
      const mockGitHubOps = createMockGitHubOperations()
      const mockEnvReader = createMockEnvironmentReader('invalid-format')

      await expect(
        createPullRequest(mockGitHubOps, mockEnvReader, 'test-branch')
      ).rejects.toThrow(
        'Invalid GITHUB_REPOSITORY format. Expected: owner/repo'
      )
    })
  })

  describe('generateBranchName', () => {
    it('should generate branch name with timestamp', () => {
      const timestamp = 1234567890
      const branchName = generateBranchName(timestamp)

      expect(branchName).toBe('update-import-paths-1234567890')
    })

    it('should generate branch name with current timestamp when not provided', () => {
      const beforeCall = Date.now()
      const branchName = generateBranchName()
      const afterCall = Date.now()

      const timestampMatch = branchName.match(/update-import-paths-(\d+)/)
      expect(timestampMatch).not.toBeNull()

      const extractedTimestamp = parseInt(timestampMatch![1], 10)
      expect(extractedTimestamp).toBeGreaterThanOrEqual(beforeCall)
      expect(extractedTimestamp).toBeLessThanOrEqual(afterCall)
    })
  })

  describe('updateRepo', () => {
    it('no changes', async () => {
      const mockGitOps = createMockGitOperations(false)
      const mockGitHubOps = createMockGitHubOperations()
      const mockEnvReader = createMockEnvironmentReader('test-owner/test-repo')
      mockGitHubOps.setRepository('test-owner', 'test-repo', 'main')

      const config = {
        gitOps: mockGitOps,
        githubOps: mockGitHubOps,
        envReader: mockEnvReader
      }
      const options: Options = { pagesDir: '.', changeType: 'commit' }

      await updateRepo(options, mockPayload, config)

      expect(mockGitOps.getAddedFiles().length).toBe(0)
      expect(mockGitOps.getCommits().length).toBe(0)
      expect(mockGitOps.isPushCalled()).toBe(false)
    })
    describe('with changeType: commit', () => {
      it('should setup git, push changes without creating branch or PR', async () => {
        const mockGitOps = createMockGitOperations(true)
        const mockGitHubOps = createMockGitHubOperations()
        const mockEnvReader = createMockEnvironmentReader(
          'test-owner/test-repo'
        )
        mockGitHubOps.setRepository('test-owner', 'test-repo', 'main')

        const config = {
          gitOps: mockGitOps,
          githubOps: mockGitHubOps,
          envReader: mockEnvReader
        }
        const options: Options = { pagesDir: '.', changeType: 'commit' }

        await updateRepo(options, mockPayload, config)

        // Should setup git account
        expect(mockGitOps.getConfigs().get('user.name')).toBe('GitHub Action')
        expect(mockGitOps.getConfigs().get('user.email')).toBe(
          'action@github.com'
        )

        // Should push changes
        expect(mockGitOps.getAddedFiles()).toEqual(['.'])
        expect(mockGitOps.getCommits()).toHaveLength(1)
        expect(mockGitOps.isPushCalled()).toBe(true)

        // Should not create branch or PR
        expect(mockGitOps.getBranches()).toHaveLength(0)
        expect(mockGitHubOps.getPullRequests()).toHaveLength(0)
      })
    })

    describe('with changeType: pr', () => {
      it('should setup git, create branch, push changes, and create PR', async () => {
        const mockGitOps = createMockGitOperations(true)
        const mockGitHubOps = createMockGitHubOperations()
        const mockEnvReader = createMockEnvironmentReader(
          'test-owner/test-repo'
        )
        mockGitHubOps.setRepository('test-owner', 'test-repo', 'main')

        const config = {
          gitOps: mockGitOps,
          githubOps: mockGitHubOps,
          envReader: mockEnvReader
        }
        const options: Options = { pagesDir: '.', changeType: 'pr' }

        await updateRepo(options, mockPayload, config)

        // Should setup git account
        expect(mockGitOps.getConfigs().get('user.name')).toBe('GitHub Action')
        expect(mockGitOps.getConfigs().get('user.email')).toBe(
          'action@github.com'
        )

        // Should create branch
        expect(mockGitOps.getBranches()).toHaveLength(1)
        expect(mockGitOps.getBranches()[0]).toMatch(/^update-import-paths-\d+$/)

        // Should push changes
        expect(mockGitOps.getAddedFiles()).toEqual(['.'])
        expect(mockGitOps.getCommits()).toHaveLength(1)
        expect(mockGitOps.isPushCalled()).toBe(true)

        // Should create PR
        const pullRequests = mockGitHubOps.getPullRequests()
        expect(pullRequests).toHaveLength(1)
        expect(pullRequests[0].title).toBe('Update Go Import Redirect Files')
        expect(pullRequests[0].head).toMatch(/^update-import-paths-\d+$/)
        expect(pullRequests[0].base).toBe('main')
      })
    })
  })

  describe('Factory functions', () => {
    describe('createProcessEnvironmentReader', () => {
      it('should read GITHUB_REPOSITORY from process.env', () => {
        const originalEnv = process.env.GITHUB_REPOSITORY
        process.env.GITHUB_REPOSITORY = 'test-owner/test-repo'

        const reader = createProcessEnvironmentReader()
        expect(reader.getGitHubRepository()).toBe('test-owner/test-repo')

        // Restore original value
        if (originalEnv !== undefined) {
          process.env.GITHUB_REPOSITORY = originalEnv
        } else {
          delete process.env.GITHUB_REPOSITORY
        }
      })

      it('should return undefined when GITHUB_REPOSITORY is not set', () => {
        const originalEnv = process.env.GITHUB_REPOSITORY
        delete process.env.GITHUB_REPOSITORY

        const reader = createProcessEnvironmentReader()
        expect(reader.getGitHubRepository()).toBeUndefined()

        // Restore original value
        if (originalEnv !== undefined) {
          process.env.GITHUB_REPOSITORY = originalEnv
        }
      })
    })

    describe('createDefaultGitServiceConfig', () => {
      it('should create a default configuration', () => {
        // Mock environment variables to avoid Octokit initialization issues
        const originalGitHubAction = process.env.GITHUB_ACTION
        const originalGitHubToken = process.env.GITHUB_TOKEN
        process.env.GITHUB_ACTION = 'test-action'
        process.env.GITHUB_TOKEN = 'test-token'

        try {
          const config = createDefaultGitServiceConfig()

          expect(config.gitOps).toBeDefined()
          expect(config.githubOps).toBeDefined()
          expect(config.envReader).toBeDefined()
        } finally {
          // Restore original values
          if (originalGitHubAction !== undefined) {
            process.env.GITHUB_ACTION = originalGitHubAction
          } else {
            delete process.env.GITHUB_ACTION
          }

          if (originalGitHubToken !== undefined) {
            process.env.GITHUB_TOKEN = originalGitHubToken
          } else {
            delete process.env.GITHUB_TOKEN
          }
        }
      })
    })
  })
})
