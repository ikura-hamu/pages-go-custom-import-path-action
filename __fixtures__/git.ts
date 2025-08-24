import { jest } from '@jest/globals'
import { GitOperations } from '../src/git/git.js'

// Mock GitOperations
export const mockGitOperations: jest.Mocked<GitOperations> = {
  setupAccount: jest.fn(),
  switchNewBranch: jest.fn(),
  commitAllChanges: jest.fn(),
  pushChanges: jest.fn(),
  checkDiff: jest.fn()
}
