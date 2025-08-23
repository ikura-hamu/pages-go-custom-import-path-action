import { exec } from '@actions/exec'

export async function checkGoExist(): Promise<boolean> {
  const result = await exec('go', ['version'])
  return result === 0
}
