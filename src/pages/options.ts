import * as core from '@actions/core'
import { z } from 'zod'

const OptionsSchema = z.object({
  pagesDir: z.string().min(1).trim().default('.')
})

export type Options = z.infer<typeof OptionsSchema>

/**
 * Interface for input reader to enable dependency injection for testing
 */
export interface InputReader {
  getInput(name: string, inputOptions?: core.InputOptions): string
}

/**
 * Default implementation using @actions/core
 */
export class ActionsInputReader implements InputReader {
  getInput(name: string, inputOptions: core.InputOptions): string {
    return core.getInput(name, inputOptions)
  }
}

/**
 * Validates and normalizes options
 * @param options - Raw options to validate
 * @returns Validated options
 */
export function validateOptions(options: { pagesDir: string }): Options {
  const result = OptionsSchema.safeParse(options)
  if (!result.success) {
    throw new Error(`Invalid options: ${result.error}`)
  }

  return result.data
}

/**
 * Loads options from input reader
 * @param inputReader - Input reader implementation (defaults to ActionsInputReader)
 * @returns Validated options
 */
export function loadOptions(
  inputReader: InputReader = new ActionsInputReader()
): Options {
  const rawOptions = {
    pagesDir: inputReader.getInput('pages_dir') || '.'
  }

  return validateOptions(rawOptions)
}
