import { getOctokit } from '@actions/github'
import { newProcessEnvironmentReader } from '../env/env.js'
import { newGitOperations } from '../git/git.js'
import { PayloadSchema, update } from '../service/update.js'
import core from '@actions/core'
import { newFs } from '../fs/fs.js'
import { newGitHubOperations } from '../github/github.js'

export default async function updateAction() {
  try {
    const pagesDir = core.getInput('pages_dir') || '.'
    const payloadStr = core.getInput('payload', { required: true })
    const changeType = core.getInput('change_type') || 'commit'
    const githubToken = core.getInput('github_token', { required: true })

    const payload = PayloadSchema.parse(payloadStr)

    const envReader = newProcessEnvironmentReader()
    const gitOps = newGitOperations()
    const octokit = getOctokit(githubToken)
    const githubOps = newGitHubOperations(octokit)
    const fsOps = newFs()

    await update(
      {
        pagesDir,
        payload,
        changeType
      },
      envReader,
      fsOps,
      gitOps,
      githubOps
    )
  } catch (error) {
    core.error(`Error occurred: ${error}`)
    core.setFailed(`Action failed: ${error}`)
  }
}
