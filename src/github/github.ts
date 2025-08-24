import { GitHub } from '@actions/github/lib/utils.js'
import {
  createIssueComment,
  CreateIssueCommentParams
} from './issue_comment.js'
import { createPullRequest, CreatePullRequestParams } from './pull_request.js'
import { getRepository, Repository } from './repository.js'

export interface GitHubOperations {
  createIssueComment(params: CreateIssueCommentParams): Promise<void>
  createPullRequest(params: CreatePullRequestParams): Promise<void>
  getRepository(owner: string, repo: string): Promise<Repository>
}

export function newGitHubOperations(
  octokit: InstanceType<typeof GitHub>
): GitHubOperations {
  return {
    createIssueComment: (params: CreateIssueCommentParams) =>
      createIssueComment(octokit, params),
    createPullRequest: (params: CreatePullRequestParams) =>
      createPullRequest(octokit, params),
    getRepository: (owner: string, repo: string) =>
      getRepository(octokit, owner, repo)
  }
}
