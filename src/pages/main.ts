import * as core from '@actions/core'
import { makeImportSuffix, validatePayload } from './content.js'
import { ActionsInputReader, InputReader, loadOptions } from './options.js'
import { FileSystemWriter, NodeFileSystemWriter, saveFile } from './page.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(
  inputReader: InputReader = new ActionsInputReader(),
  fsSystemWriter: FileSystemWriter = new NodeFileSystemWriter()
): Promise<void> {
  try {
    const payloadStr: string = core.getInput('payload', {
      required: true
    })

    // Parse and validate payload
    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(payloadStr)
    } catch (error) {
      throw new Error(
        `Invalid JSON payload: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    validatePayload(parsedPayload)
    const payload = parsedPayload

    // Load and validate options
    const options = loadOptions(inputReader)

    // Generate import suffixes
    const importSuffixList = makeImportSuffix(payload.goModInfo)

    if (importSuffixList.length === 0) {
      core.debug('No import suffixes found that match the module path')
      return
    }

    saveFile(payload, options, '', fsSystemWriter)

    // Save files for each import suffix
    importSuffixList.forEach((importSuffix) => {
      saveFile(payload, options, importSuffix, fsSystemWriter)
      core.debug(`Generated HTML file for import path: ${importSuffix}`)
    })
  } catch (error) {
    core.error(`Action failed: ${error}`)
    // Fail the workflow run if an error occurs
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    core.setFailed(errorMessage)
  }
}
