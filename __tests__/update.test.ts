/**
 * Unit tests for the update service, src/service/update.ts
 */
import { jest } from '@jest/globals'
import { TemplateConfig } from '../src/service/update.js'
import { JSDOM } from 'jsdom'
import { mockEnvironmentReader } from '../__fixtures__/env.js'
import { mockFs } from '../__fixtures__/fs.js'
import { mockGitOperations } from '../__fixtures__/git.js'
import { mockGitHubOperations } from '../__fixtures__/github.js'
import { GoModInfo } from '../src/go/mod.js'
import { Payload } from '../src/service/update.js'
import { Repository } from '../src/github/repository.js'

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { update, generateTemplate } = await import('../src/service/update.js')

describe('generateTemplate', () => {
  it('should generate a template with the correct frontmatter', () => {
    const config: TemplateConfig = {
      importPrefix: 'example.com/mod',
      owner: 'example',
      repoName: 'repo'
    }

    const expectHtmlStr = `<!DOCTYPE html>
<html>
  <head>
    <meta
      name="go-import"
      content="${config.importPrefix} git https://github.com/${config.owner}/${config.repoName}.git"
    />
    <meta charset="utf-8" />
    <meta
      http-equiv="refresh"
      content="0; url=https://pkg.go.dev/${config.importPrefix}"
    />
  </head>
  <body>
    Redirecting to
    <a href="https://pkg.go.dev/${config.importPrefix}"
      >https://pkg.go.dev/${config.importPrefix}</a
    >...
  </body>
</html>`
    const expected = new JSDOM(expectHtmlStr)
    const result = generateTemplate(config)

    const findGoMeta = (dom: JSDOM) =>
      dom.window.document.querySelector("head meta[name='go-import']")
    const expectedGoImport = findGoMeta(expected)
    const resultGoImport = findGoMeta(result)

    expect(resultGoImport).toBeTruthy()
    expect(resultGoImport?.getAttribute('content')).toBe(
      expectedGoImport?.getAttribute('content')
    )

    const findHttpEquiv = (dom: JSDOM) =>
      dom.window.document.querySelector("head meta[http-equiv='refresh']")
    const expectedHttpEquiv = findHttpEquiv(expected)
    const resultHttpEquiv = findHttpEquiv(result)

    expect(resultHttpEquiv).toBeTruthy()
    expect(resultHttpEquiv?.getAttribute('content')).toBe(
      expectedHttpEquiv?.getAttribute('content')
    )
  })
})

describe('update', () => {
  const mockGoModInfo: GoModInfo = {
    Module: {
      Path: 'example.com/test-module'
    },
    Imports: [
      'example.com/test-module/pkg1',
      'example.com/test-module/pkg2',
      'other.com/external'
    ]
  }

  const mockPayload: Payload = {
    owner: 'test-owner',
    repoName: 'test-repo',
    goModInfo: mockGoModInfo
  }

  const mockRepository: Repository = {
    owner: 'current-owner',
    repo: 'current-repo',
    default_branch: 'main'
  }

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks()

    // Set up default mock behaviors
    mockEnvironmentReader.getGitHubRepository.mockReturnValue(
      'current-owner/current-repo'
    )
    mockGitOperations.checkDiff.mockResolvedValue(true)
    mockGitOperations.setupAccount.mockResolvedValue()
    mockGitOperations.switchNewBranch.mockResolvedValue()
    mockGitOperations.commitAllChanges.mockResolvedValue()
    mockGitOperations.pushChanges.mockResolvedValue()
    mockFs.saveFile.mockResolvedValue()
    mockGitHubOperations.getRepository.mockResolvedValue(mockRepository)
    mockGitHubOperations.createPullRequest.mockResolvedValue()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('successfully updates files and creates pull request when changeType is pr', async () => {
    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    await update(
      params,
      mockEnvironmentReader,
      mockFs,
      mockGitOperations,
      mockGitHubOperations
    )

    // Verify environment repository was retrieved
    expect(mockEnvironmentReader.getGitHubRepository).toHaveBeenCalledTimes(1)

    // Verify files were saved (should save for each suffix + root)
    expect(mockFs.saveFile).toHaveBeenCalledTimes(3) // pkg1, pkg2, and root ('')

    // Verify git operations
    expect(mockGitOperations.checkDiff).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.setupAccount).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.switchNewBranch).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.commitAllChanges).toHaveBeenCalledWith(
      'Update redirect files'
    )
    expect(mockGitOperations.pushChanges).toHaveBeenCalledTimes(1)

    // Verify GitHub operations
    expect(mockGitHubOperations.getRepository).toHaveBeenCalledWith(
      'current-owner',
      'current-repo'
    )
    expect(mockGitHubOperations.createPullRequest).toHaveBeenCalledWith({
      head: expect.stringMatching(/^update-redirect-files-\d+$/),
      base: 'main',
      title: 'Update redirect files /test-module',
      owner: 'current-owner',
      repo: 'current-repo'
    })
  })

  it('successfully updates files without creating pull request when changeType is not pr', async () => {
    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'commit'
    }

    await update(
      params,
      mockEnvironmentReader,
      mockFs,
      mockGitOperations,
      mockGitHubOperations
    )

    // Verify git operations (no branch switch for direct commit)
    expect(mockGitOperations.checkDiff).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.setupAccount).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.switchNewBranch).not.toHaveBeenCalled()
    expect(mockGitOperations.commitAllChanges).toHaveBeenCalledWith(
      'Update redirect files'
    )
    expect(mockGitOperations.pushChanges).toHaveBeenCalledTimes(1)

    // Verify no GitHub PR operations
    expect(mockGitHubOperations.getRepository).not.toHaveBeenCalled()
    expect(mockGitHubOperations.createPullRequest).not.toHaveBeenCalled()
  })

  it('returns early when no git diff is detected', async () => {
    mockGitOperations.checkDiff.mockResolvedValue(false)

    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    await update(
      params,
      mockEnvironmentReader,
      mockFs,
      mockGitOperations,
      mockGitHubOperations
    )

    // Verify files were still saved
    expect(mockFs.saveFile).toHaveBeenCalledTimes(3)

    // Verify git diff was checked
    expect(mockGitOperations.checkDiff).toHaveBeenCalledTimes(1)

    // Verify no further git operations
    expect(mockGitOperations.setupAccount).not.toHaveBeenCalled()
    expect(mockGitOperations.switchNewBranch).not.toHaveBeenCalled()
    expect(mockGitOperations.commitAllChanges).not.toHaveBeenCalled()
    expect(mockGitOperations.pushChanges).not.toHaveBeenCalled()

    // Verify no GitHub operations
    expect(mockGitHubOperations.getRepository).not.toHaveBeenCalled()
    expect(mockGitHubOperations.createPullRequest).not.toHaveBeenCalled()
  })

  it('throws error when current repository is not found', async () => {
    mockEnvironmentReader.getGitHubRepository.mockReturnValue(undefined)

    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    await expect(
      update(
        params,
        mockEnvironmentReader,
        mockFs,
        mockGitOperations,
        mockGitHubOperations
      )
    ).rejects.toThrow('Current repository not found')

    // Verify only environment was checked
    expect(mockEnvironmentReader.getGitHubRepository).toHaveBeenCalledTimes(1)
    expect(mockFs.saveFile).not.toHaveBeenCalled()
    expect(mockGitOperations.checkDiff).not.toHaveBeenCalled()
  })

  it('handles file saving errors', async () => {
    const error = new Error('Failed to save file')
    mockFs.saveFile.mockRejectedValue(error)

    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    await expect(
      update(
        params,
        mockEnvironmentReader,
        mockFs,
        mockGitOperations,
        mockGitHubOperations
      )
    ).rejects.toThrow('Failed to save file')

    // Verify environment was checked
    expect(mockEnvironmentReader.getGitHubRepository).toHaveBeenCalledTimes(1)
    expect(mockFs.saveFile).toHaveBeenCalled()
    expect(mockGitOperations.checkDiff).not.toHaveBeenCalled()
  })

  it('handles git operation errors', async () => {
    const error = new Error('Git operation failed')
    mockGitOperations.commitAllChanges.mockRejectedValue(error)

    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    await expect(
      update(
        params,
        mockEnvironmentReader,
        mockFs,
        mockGitOperations,
        mockGitHubOperations
      )
    ).rejects.toThrow('Git operation failed')

    // Verify operations up to the failure point
    expect(mockFs.saveFile).toHaveBeenCalledTimes(3)
    expect(mockGitOperations.checkDiff).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.setupAccount).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.switchNewBranch).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.commitAllChanges).toHaveBeenCalledTimes(1)
    expect(mockGitOperations.pushChanges).not.toHaveBeenCalled()
  })

  it('handles GitHub API errors', async () => {
    const error = new Error('GitHub API error')
    mockGitHubOperations.createPullRequest.mockRejectedValue(error)

    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    await expect(
      update(
        params,
        mockEnvironmentReader,
        mockFs,
        mockGitOperations,
        mockGitHubOperations
      )
    ).rejects.toThrow('GitHub API error')

    // Verify all operations up to GitHub PR creation
    expect(mockGitOperations.pushChanges).toHaveBeenCalledTimes(1)
    expect(mockGitHubOperations.getRepository).toHaveBeenCalledTimes(1)
    expect(mockGitHubOperations.createPullRequest).toHaveBeenCalledTimes(1)
  })

  it('saves files with correct paths for different import suffixes', async () => {
    const params = {
      payload: mockPayload,
      pagesDir: 'custom-pages',
      changeType: 'commit'
    }

    await update(
      params,
      mockEnvironmentReader,
      mockFs,
      mockGitOperations,
      mockGitHubOperations
    )

    // Verify saveFile was called with correct paths
    expect(mockFs.saveFile).toHaveBeenCalledWith(
      'custom-pages/test-module/pkg1/index.html',
      expect.any(String)
    )
    expect(mockFs.saveFile).toHaveBeenCalledWith(
      'custom-pages/test-module/pkg2/index.html',
      expect.any(String)
    )
    expect(mockFs.saveFile).toHaveBeenCalledWith(
      'custom-pages/test-module/index.html',
      expect.any(String)
    )
  })

  it('generates correct branch name with timestamp', async () => {
    const params = {
      payload: mockPayload,
      pagesDir: 'pages',
      changeType: 'pr'
    }

    // Mock Date.getTime to return a fixed value
    const mockTimestamp = 1234567890123
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(mockTimestamp)

    await update(
      params,
      mockEnvironmentReader,
      mockFs,
      mockGitOperations,
      mockGitHubOperations
    )

    expect(mockGitOperations.switchNewBranch).toHaveBeenCalledWith(
      `update-redirect-files-${mockTimestamp}`
    )

    // Restore Date.getTime
    jest.restoreAllMocks()
  })
})
