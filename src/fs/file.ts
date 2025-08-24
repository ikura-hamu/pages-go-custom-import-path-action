import { writeFileSync } from 'fs'
import io from '@actions/io'
import path from 'path'

export async function saveFile(filePath: string, f: string | Buffer) {
  await io.mkdirP(path.dirname(filePath))

  writeFileSync(filePath, f)
}
