/**
 * Unit tests for the action's main functionality, src/pages/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

// Mock the dependencies
jest.unstable_mockModule('@actions/core', () => core)

// Mock the git module to avoid Octokit initialization issues in tests
const mockUpdateRepo = jest.fn()
jest.unstable_mockModule('../../src/pages/git.js', () => ({
  updateRepo: mockUpdateRepo
}))

// Import types for testing
import type { InputReader } from '../../src/pages/options.js'
import type { FileSystemWriter } from '../../src/pages/page.js'

// Mock implementations for testing
class MockInputReader implements InputReader {
  private inputs: Map<string, string> = new Map()

  getInput(name: string): string {
    return this.inputs.get(name) || ''
  }

  setInput(name: string, value: string): void {
    this.inputs.set(name, value)
  }
}

class MockFileSystemWriter implements FileSystemWriter {
  public writtenFiles: Map<string, string> = new Map()
  public createdDirectories: Set<string> = new Set()

  writeFile(filePath: string, content: string): void {
    this.writtenFiles.set(filePath, content)
  }

  createDirectory(dirPath: string): void {
    this.createdDirectories.add(dirPath)
  }

  clear(): void {
    this.writtenFiles.clear()
    this.createdDirectories.clear()
  }
}

// The module being tested should be imported dynamically
const { run } = await import('../../src/pages/main.js')

describe('pages/main.ts', () => {
  let mockInputReader: MockInputReader
  let mockFileSystemWriter: MockFileSystemWriter

  beforeEach(() => {
    mockInputReader = new MockInputReader()
    mockFileSystemWriter = new MockFileSystemWriter()

    // Set default input values
    mockInputReader.setInput('pages_dir', '.')

    // Reset the mock function
    mockUpdateRepo.mockReset()
  })

  afterEach(() => {
    jest.resetAllMocks()
    mockFileSystemWriter.clear()
  })

  it('successfully generates HTML files for valid payload', async () => {
    const payload = {
      owner: 'test-owner',
      repoName: 'test-repo',
      goModInfo: {
        Module: {
          Path: 'example.com/mod'
        },
        Imports: [
          'example.com/mod/pkg/auth',
          'example.com/mod/internal/db',
          'example.com/other/library'
        ]
      }
    }

    // Mock core.getInput to return the payload
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return JSON.stringify(payload)
      }
      return ''
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that files were written
    expect(mockFileSystemWriter.writtenFiles.size).toBe(3) // Root + 2 suffixes
    expect(mockFileSystemWriter.writtenFiles.has('mod/index.html')).toBe(true)
    expect(
      mockFileSystemWriter.writtenFiles.has('mod/pkg/auth/index.html')
    ).toBe(true)
    expect(
      mockFileSystemWriter.writtenFiles.has('mod/internal/db/index.html')
    ).toBe(true)

    // Verify that directories were created
    expect(mockFileSystemWriter.createdDirectories.has('mod')).toBe(true)
    expect(mockFileSystemWriter.createdDirectories.has('mod/pkg/auth')).toBe(
      true
    )
    expect(mockFileSystemWriter.createdDirectories.has('mod/internal/db')).toBe(
      true
    )

    // Verify that setFailed was not called
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('handles no matching import suffixes', async () => {
    const payload = {
      owner: 'test-owner',
      repoName: 'test-repo',
      goModInfo: {
        Module: {
          Path: 'example.com/mod'
        },
        Imports: ['example.com/other/library', 'golang.org/x/crypto']
      }
    }

    // Mock core.getInput to return the payload
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return JSON.stringify(payload)
      }
      return ''
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that no files were written (function returns early)
    expect(mockFileSystemWriter.writtenFiles.has('mod/index.html')).toBe(true)
    expect(mockFileSystemWriter.createdDirectories.has('mod')).toBe(true)
  })

  it('sets failed status for invalid JSON payload', async () => {
    // Mock core.getInput to return invalid JSON
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return 'invalid json'
      }
      return ''
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that setFailed was called with appropriate error message
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Invalid JSON payload')
    )

    // Verify that no files were written
    expect(mockFileSystemWriter.writtenFiles.size).toBe(0)
  })

  it('sets failed status for missing payload', async () => {
    // Mock core.getInput to throw an error (simulating required input not provided)
    core.getInput.mockImplementation(() => {
      throw new Error('Input required and not supplied: payload')
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that setFailed was called
    expect(core.setFailed).toHaveBeenCalledWith(
      'Input required and not supplied: payload'
    )

    // Verify that no files were written
    expect(mockFileSystemWriter.writtenFiles.size).toBe(0)
  })

  it('sets failed status for invalid payload structure', async () => {
    const invalidPayload = {
      owner: 'test-owner'
      // Missing repoName and goModInfo
    }

    // Mock core.getInput to return the invalid payload
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return JSON.stringify(invalidPayload)
      }
      return ''
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that setFailed was called with validation error
    expect(core.setFailed).toHaveBeenCalledWith('Invalid payload')

    // Verify that no files were written
    expect(mockFileSystemWriter.writtenFiles.size).toBe(0)
  })

  it('uses custom pages directory from input', async () => {
    const payload = {
      owner: 'test-owner',
      repoName: 'test-repo',
      goModInfo: {
        Module: {
          Path: 'example.com/mod'
        },
        Imports: ['example.com/mod/pkg/auth']
      }
    }

    // Set custom pages directory
    mockInputReader.setInput('pages_dir', 'custom-pages')

    // Mock core.getInput to return the payload
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return JSON.stringify(payload)
      }
      return ''
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that files were written to custom directory
    expect(
      mockFileSystemWriter.writtenFiles.has('custom-pages/mod/index.html')
    ).toBe(true)
    expect(
      mockFileSystemWriter.writtenFiles.has(
        'custom-pages/mod/pkg/auth/index.html'
      )
    ).toBe(true)

    // Verify that custom directories were created
    expect(
      mockFileSystemWriter.createdDirectories.has('custom-pages/mod')
    ).toBe(true)
    expect(
      mockFileSystemWriter.createdDirectories.has('custom-pages/mod/pkg/auth')
    ).toBe(true)

    // Verify success
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('handles file system writer errors gracefully', async () => {
    const payload = {
      owner: 'test-owner',
      repoName: 'test-repo',
      goModInfo: {
        Module: {
          Path: 'example.com/mod'
        },
        Imports: ['example.com/mod/pkg/auth']
      }
    }

    // Create a mock file system writer that throws an error
    const errorFileSystemWriter: FileSystemWriter = {
      writeFile: jest.fn(() => {
        throw new Error('Permission denied')
      }),
      createDirectory: jest.fn()
    }

    // Mock core.getInput to return the payload
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return JSON.stringify(payload)
      }
      return ''
    })

    await run(mockInputReader, errorFileSystemWriter)

    // Verify that setFailed was called with the file system error
    expect(core.setFailed).toHaveBeenCalledWith('Permission denied')
  })

  it('import prefix is only domain part', async () => {
    const payload = {
      owner: 'test-owner',
      repoName: 'test-repo',
      goModInfo: {
        Module: {
          Path: 'example.com'
        },
        Imports: ['example.com/mod/pkg/auth']
      }
    }

    // Mock core.getInput to return the payload
    core.getInput.mockImplementation((name: string) => {
      if (name === 'payload') {
        return JSON.stringify(payload)
      }
      return ''
    })

    await run(mockInputReader, mockFileSystemWriter)

    // Verify that files were written to custom directory
    expect(mockFileSystemWriter.writtenFiles.has('index.html')).toBe(true)
    expect(
      mockFileSystemWriter.writtenFiles.has('mod/pkg/auth/index.html')
    ).toBe(true)

    // Verify that custom directories were created
    expect(mockFileSystemWriter.createdDirectories.has('./')).toBe(true)
    expect(mockFileSystemWriter.createdDirectories.has('mod/pkg/auth')).toBe(
      true
    )

    // Verify success
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
