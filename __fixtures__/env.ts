import { jest } from '@jest/globals'
import { EnvironmentReader } from '../src/env/env.js'

// Mock EnvironmentReader
export const mockEnvironmentReader: jest.Mocked<EnvironmentReader> = {
  getGitHubRepository: jest.fn()
}
