import { saveFile } from './file.js'

export interface Fs {
  saveFile(filePath: string, content: string | Buffer): Promise<void>
}

export function newFs(): Fs {
  return {
    saveFile: saveFile
  }
}
