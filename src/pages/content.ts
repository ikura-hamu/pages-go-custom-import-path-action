import { z } from 'zod'
import path from 'path'

const GoModInfoSchema = z.object({
  Module: z.object({
    Path: z.string().min(1)
  }),
  Imports: z.array(z.string().min(1))
})

export type GoModInfo = z.infer<typeof GoModInfoSchema>

const PayloadSchema = z.object({
  owner: z.string().min(1),
  repoName: z.string().min(1),
  goModInfo: GoModInfoSchema
})

export type Payload = z.infer<typeof PayloadSchema>

/**
 * Validates that the payload has all required fields
 * @param payload - The payload to validate
 * @throws Error if payload is invalid
 */
export function validatePayload(payload: unknown): asserts payload is Payload {
  try {
    PayloadSchema.parse(payload)
  } catch (error) {
    throw new Error('Invalid payload', { cause: error })
  }
}

/**
 * Extracts import suffixes from go module info that match the module path
 * @param goModInfo - The go module information
 * @returns Array of import suffixes (paths relative to the module root)
 */
export function makeImportSuffix(goModInfo: GoModInfo): string[] {
  if (!goModInfo.Module.Path) {
    return []
  }

  return goModInfo.Imports.filter((imp) =>
    checkPrefixUrl(imp, goModInfo.Module.Path)
  )
    .map((imp) => imp.replace(goModInfo.Module.Path, '').replace(/^\//, ''))
    .filter((suffix) => suffix.length > 0) // Remove empty suffixes
}

function checkPrefixUrl(targetPathStr: string, prefixPathStr: string): boolean {
  const targetUrl = URL.parse('http://' + targetPathStr)
  const prefixUrl = URL.parse('http://' + prefixPathStr)

  if (!targetUrl || !prefixUrl) {
    return false
  }

  if (targetUrl.hostname !== prefixUrl.hostname) {
    return false
  }

  const normalizedTargetUrlPath = path.normalize(targetUrl.pathname)
  const normalizedPrefixUrlPath = path.normalize(prefixUrl.pathname)

  if (normalizedPrefixUrlPath === '') {
    // Normalize URLs by removing trailing slashes
    // If prefix is empty, URL is always under it
    return true
  }

  // Check if URL starts with prefix followed by '/' or is exactly equal
  return (
    normalizedTargetUrlPath === normalizedPrefixUrlPath ||
    normalizedTargetUrlPath.startsWith(normalizedPrefixUrlPath + '/')
  )
}
