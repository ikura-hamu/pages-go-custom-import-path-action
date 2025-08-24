import { EnvironmentReader } from '../env/env.js'
import { GitHubOperations } from '../github/github.js'
import { GoOperations } from '../go/go.js'
import { Payload } from './update.js'

export type NotificationParams = {
  owner: string
  repoName: string
  notifyIssueNumber: number
}

export async function generatePayload(
  go: GoOperations,
  envReader: EnvironmentReader
): Promise<Payload> {
  if (!(await go.checkExistence())) {
    throw new Error('Go environment does not exist')
  }

  const modInfo = await go.getModInfo()

  const currentRepo = envReader.getGitHubRepository()
  if (!currentRepo) {
    throw new Error('GITHUB_REPOSITORY is not defined')
  }

  const [currentRepoOwner, currentRepoName] = currentRepo.split('/')

  return {
    owner: currentRepoOwner,
    repoName: currentRepoName,
    goModInfo: modInfo
  }
}

export async function notify(
  params: NotificationParams,
  go: GoOperations,
  github: GitHubOperations,
  envReader: EnvironmentReader
) {
  const body = await generatePayload(go, envReader)

  await github.createIssueComment({
    owner: params.owner,
    repoName: params.repoName,
    issueNumber: params.notifyIssueNumber,
    comment: JSON.stringify(body, null, 2)
  })
}
