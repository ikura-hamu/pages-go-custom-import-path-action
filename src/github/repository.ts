import { GitHub } from '@actions/github/lib/utils.js'

export type Repository = {
  owner: string
  repo: string
  default_branch: string
}

export async function getRepository(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string
): Promise<Repository> {
  const { data: repository } = await octokit.rest.repos.get({
    owner,
    repo
  })

  return {
    owner: repository.owner.login,
    repo: repository.name,
    default_branch: repository.default_branch
  }
}
