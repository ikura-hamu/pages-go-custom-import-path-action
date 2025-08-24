import { jest } from '@jest/globals'
import { Fs } from '../src/fs/fs.js'

// Mock Fs
export const mockFs: jest.Mocked<Fs> = {
  saveFile: jest.fn()
}
