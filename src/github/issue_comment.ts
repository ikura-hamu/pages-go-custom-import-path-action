import { GitHub } from '@actions/github/lib/utils.js'

export type CreateIssueCommentParams = {
  issueNumber: number
  comment: string
  owner: string
  repoName: string
}

export async function createIssueComment(
  octokit: InstanceType<typeof GitHub>,
  params: CreateIssueCommentParams
) {
  await octokit.rest.issues.createComment({
    issue_number: params.issueNumber,
    body: params.comment,
    owner: params.owner,
    repo: params.repoName
  })

  return
}
