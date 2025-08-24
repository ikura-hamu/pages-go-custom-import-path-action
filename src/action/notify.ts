import * as core from '@actions/core'
import github from '@actions/github'
import { NotificationParams, notify } from '../service/notify.js'
import { newGo } from '../go/go.js'
import { newGitHubOperations } from '../github/github.js'
import { newProcessEnvironmentReader } from '../env/env.js'

export default async function notifyAction() {
  try {
    const owner = core.getInput('owner', { required: true })
    const repoName = core.getInput('repo_name', { required: true })
    const issueNumber = core.getInput('issue_number', { required: true })
    const ghToken = core.getInput('github_token', { required: true })

    const param: NotificationParams = {
      owner: owner,
      repoName: repoName,
      notifyIssueNumber: parseInt(issueNumber, 10)
    }

    const octokit = github.getOctokit(ghToken)
    const go = newGo()
    const githubOps = newGitHubOperations(octokit)
    const env = newProcessEnvironmentReader()

    notify(param, go, githubOps, env)
  } catch (error) {
    core.error(`Error: ${error}`)
    core.setFailed((error as Error).message)
  }
}
