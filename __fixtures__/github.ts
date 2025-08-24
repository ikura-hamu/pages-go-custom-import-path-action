import { jest } from '@jest/globals'
import { GitHubOperations } from '../src/github/github.js'

// Mock GitHubOperations
export const mockGitHubOperations: jest.Mocked<GitHubOperations> = {
  createIssueComment: jest.fn(),
  createPullRequest: jest.fn(),
  getRepository: jest.fn()
}
