import { checkGoExist } from './exist.js'
import { getGoModInfo, GoModInfo } from './mod.js'

export interface GoOperations {
  checkExistence: () => Promise<boolean>
  getModInfo: () => Promise<GoModInfo>
}

export function newGo(): GoOperations {
  return {
    checkExistence: checkGoExist,
    getModInfo: getGoModInfo
  }
}
