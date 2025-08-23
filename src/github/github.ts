import { GitHub } from '@actions/github/lib/utils.js'
import {
  createIssueComment,
  CreateIssueCommentParams
} from './issue_comment.js'

export interface GitHubOperations {
  createIssueComment(params: CreateIssueCommentParams): Promise<void>
}

export function newGitHubOperations(
  octokit: InstanceType<typeof GitHub>
): GitHubOperations {
  return {
    createIssueComment: (params: CreateIssueCommentParams) =>
      createIssueComment(octokit, params)
  }
}
