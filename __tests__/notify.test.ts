/**
 * Unit tests for the notify service, src/service/notify.ts
 */
import { jest } from '@jest/globals'
import { mockEnvironmentReader } from '../__fixtures__/env.js'
import { mockGitHubOperations } from '../__fixtures__/github.js'
import { mockGoOperations, mockGoModInfo } from '../__fixtures__/go.js'

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { notify } = await import('../src/service/notify.js')

describe('notify.ts', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks()

    // Set up default mock behaviors
    mockGoOperations.checkExistence.mockResolvedValue(true)
    mockGoOperations.getModInfo.mockResolvedValue(mockGoModInfo)
    mockEnvironmentReader.getGitHubRepository.mockReturnValue(
      'test-owner/test-repo'
    )
    mockGitHubOperations.createIssueComment.mockResolvedValue()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('successfully creates an issue comment with correct payload', async () => {
    const params = {
      owner: 'target-owner',
      repoName: 'target-repo',
      notifyIssueNumber: 123
    }

    await notify(
      params,
      mockGoOperations,
      mockGitHubOperations,
      mockEnvironmentReader
    )

    // Verify Go existence was checked
    expect(mockGoOperations.checkExistence).toHaveBeenCalledTimes(1)

    // Verify module info was retrieved
    expect(mockGoOperations.getModInfo).toHaveBeenCalledTimes(1)

    // Verify GitHub repository was retrieved
    expect(mockEnvironmentReader.getGitHubRepository).toHaveBeenCalledTimes(1)

    // Verify issue comment was created with correct parameters
    expect(mockGitHubOperations.createIssueComment).toHaveBeenCalledTimes(1)
    expect(mockGitHubOperations.createIssueComment).toHaveBeenCalledWith({
      owner: 'target-owner',
      repoName: 'target-repo',
      issueNumber: 123,
      comment: JSON.stringify(
        {
          owner: 'test-owner',
          repoName: 'test-repo',
          goModInfo: mockGoModInfo
        },
        null,
        2
      )
    })
  })

  it('throws error when Go environment does not exist', async () => {
    mockGoOperations.checkExistence.mockResolvedValue(false)

    const params = {
      owner: 'target-owner',
      repoName: 'target-repo',
      notifyIssueNumber: 123
    }

    await expect(
      notify(
        params,
        mockGoOperations,
        mockGitHubOperations,
        mockEnvironmentReader
      )
    ).rejects.toThrow()

    // Verify only checkExistence was called
    expect(mockGoOperations.checkExistence).toHaveBeenCalledTimes(1)
    expect(mockGoOperations.getModInfo).not.toHaveBeenCalled()
    expect(mockEnvironmentReader.getGitHubRepository).not.toHaveBeenCalled()
    expect(mockGitHubOperations.createIssueComment).not.toHaveBeenCalled()
  })

  it('throws error when GITHUB_REPOSITORY is not defined', async () => {
    mockEnvironmentReader.getGitHubRepository.mockReturnValue(undefined)

    const params = {
      owner: 'target-owner',
      repoName: 'target-repo',
      notifyIssueNumber: 123
    }

    await expect(
      notify(
        params,
        mockGoOperations,
        mockGitHubOperations,
        mockEnvironmentReader
      )
    ).rejects.toThrow()

    // Verify execution stopped after environment check
    expect(mockGoOperations.checkExistence).toHaveBeenCalledTimes(1)
    expect(mockGoOperations.getModInfo).toHaveBeenCalledTimes(1)
    expect(mockEnvironmentReader.getGitHubRepository).toHaveBeenCalledTimes(1)
    expect(mockGitHubOperations.createIssueComment).not.toHaveBeenCalled()
  })

  it('handles Go module info retrieval failure', async () => {
    const error = new Error('Failed to get Go module information')
    mockGoOperations.getModInfo.mockRejectedValue(error)

    const params = {
      owner: 'target-owner',
      repoName: 'target-repo',
      notifyIssueNumber: 123
    }

    await expect(
      notify(
        params,
        mockGoOperations,
        mockGitHubOperations,
        mockEnvironmentReader
      )
    ).rejects.toThrow()

    // Verify execution stopped after getModInfo failure
    expect(mockGoOperations.checkExistence).toHaveBeenCalledTimes(1)
    expect(mockGoOperations.getModInfo).toHaveBeenCalledTimes(1)
    expect(mockEnvironmentReader.getGitHubRepository).not.toHaveBeenCalled()
    expect(mockGitHubOperations.createIssueComment).not.toHaveBeenCalled()
  })

  it('handles GitHub issue comment creation failure', async () => {
    const error = new Error('Failed to create issue comment')
    mockGitHubOperations.createIssueComment.mockRejectedValue(error)

    const params = {
      owner: 'target-owner',
      repoName: 'target-repo',
      notifyIssueNumber: 123
    }

    await expect(
      notify(
        params,
        mockGoOperations,
        mockGitHubOperations,
        mockEnvironmentReader
      )
    ).rejects.toThrow()

    // Verify all steps were attempted
    expect(mockGoOperations.checkExistence).toHaveBeenCalledTimes(1)
    expect(mockGoOperations.getModInfo).toHaveBeenCalledTimes(1)
    expect(mockEnvironmentReader.getGitHubRepository).toHaveBeenCalledTimes(1)
    expect(mockGitHubOperations.createIssueComment).toHaveBeenCalledTimes(1)
  })

  it('correctly parses repository owner and name from GITHUB_REPOSITORY', async () => {
    mockEnvironmentReader.getGitHubRepository.mockReturnValue(
      'my-org/my-awesome-repo'
    )

    const params = {
      owner: 'target-owner',
      repoName: 'target-repo',
      notifyIssueNumber: 456
    }

    await notify(
      params,
      mockGoOperations,
      mockGitHubOperations,
      mockEnvironmentReader
    )

    // Verify the correct owner and repo name were used in the payload
    const expectedPayload = {
      owner: 'my-org',
      repoName: 'my-awesome-repo',
      goModInfo: mockGoModInfo
    }

    expect(mockGitHubOperations.createIssueComment).toHaveBeenCalledWith({
      owner: 'target-owner',
      repoName: 'target-repo',
      issueNumber: 456,
      comment: JSON.stringify(expectedPayload, null, 2)
    })
  })

  it('handles different notification parameters correctly', async () => {
    const params = {
      owner: 'different-owner',
      repoName: 'different-repo',
      notifyIssueNumber: 999
    }

    await notify(
      params,
      mockGoOperations,
      mockGitHubOperations,
      mockEnvironmentReader
    )

    expect(mockGitHubOperations.createIssueComment).toHaveBeenCalledWith({
      owner: 'different-owner',
      repoName: 'different-repo',
      issueNumber: 999,
      comment: JSON.stringify(
        {
          owner: 'test-owner',
          repoName: 'test-repo',
          goModInfo: mockGoModInfo
        },
        null,
        2
      )
    })
  })
})
