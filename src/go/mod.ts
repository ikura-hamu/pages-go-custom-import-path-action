import { z } from 'zod'
import { exec } from '@actions/exec'

export const GoModInfoSchema = z.object({
  Module: z.object({
    Path: z.string().min(1)
  }),
  Imports: z.array(z.string().min(1))
})

export type GoModInfo = z.infer<typeof GoModInfoSchema>

export async function getGoModInfo(): Promise<GoModInfo> {
  let stdout = ''
  let stderr = ''
  const result = await exec('go', ['list', '-json=Module,Imports', '.'], {
    listeners: {
      stdout: (data) => {
        stdout += data.toString()
      },
      stderr: (data) => {
        stderr += data.toString()
      }
    }
  })
  if (result !== 0) {
    throw new Error(`Failed to get Go module information: ${stderr}`)
  }

  return GoModInfoSchema.parse(JSON.parse(stdout))
}
