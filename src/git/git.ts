import { SimpleGit, simpleGit } from 'simple-git'

export interface GitOperations {
  setupAccount(): Promise<void>
  switchNewBranch(branchName: string): Promise<void>
  commitAllChanges(commitMessage: string): Promise<void>
  pushChanges(): Promise<void>
  checkDiff(): Promise<boolean>
}

export function newGitOperations(git: SimpleGit = simpleGit()): GitOperations {
  return {
    setupAccount: () => setupAccount(git),
    switchNewBranch: (branchName) => switchNewBranch(git, branchName),
    commitAllChanges: (commitMessage) => commitAllChanges(git, commitMessage),
    pushChanges: () => pushChanges(git),
    checkDiff: () => checkDiff(git)
  }
}

export async function setupAccount(git: SimpleGit) {
  await git.addConfig('user.name', 'GitHub Action')
  await git.addConfig('user.email', 'action@github.com')
}

export async function switchNewBranch(git: SimpleGit, branchName: string) {
  await git.checkoutLocalBranch(branchName)
}

export async function commitAllChanges(git: SimpleGit, commitMessage: string) {
  await git.add('.')
  await git.commit(commitMessage)
}

export async function pushChanges(git: SimpleGit) {
  await git.push('origin', 'HEAD')
}

export async function checkDiff(git: SimpleGit): Promise<boolean> {
  const status = await git.status()
  return !status.isClean()
}
