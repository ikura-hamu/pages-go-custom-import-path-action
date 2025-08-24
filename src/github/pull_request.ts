import { GitHub } from '@actions/github/lib/utils.js'

export type CreatePullRequestParams = {
  owner: string
  repo: string
  title: string
  head: string
  base: string
}

export async function createPullRequest(
  octokit: InstanceType<typeof GitHub>,
  params: CreatePullRequestParams
) {
  await octokit.rest.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    head: params.head,
    base: params.base
  })
}
