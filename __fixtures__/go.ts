import { jest } from '@jest/globals'
import { GoOperations } from '../src/go/go.js'
import { GoModInfo } from '../src/go/mod.js'

// Mock GoOperations
export const mockGoOperations: jest.Mocked<GoOperations> = {
  checkExistence: jest.fn(),
  getModInfo: jest.fn()
}

// Mock data for tests
export const mockGoModInfo: GoModInfo = {
  Module: {
    Path: 'github.com/example/test-module'
  },
  Imports: [
    'github.com/example/test-module/internal/config',
    'github.com/example/test-module/pkg/utils',
    'external-package'
  ]
}
