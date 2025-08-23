/**
 * Unit tests for the content functionality, src/update/content.ts
 */
import { makeImportSuffix } from '../../src/update/content.js'
import type { GoModInfo } from '../../src/update/content.js'

describe('content.ts', () => {
  describe('makeImportSuffix', () => {
    it('returns empty array when Module.Path is empty', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: ''
        },
        Imports: ['github.com/example/repo/pkg']
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual([])
    })

    it('filters imports that start with module path and returns suffixes', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: [
          'github.com/example/repo/pkg/auth',
          'github.com/example/repo/internal/db',
          'github.com/other/library',
          'github.com/example/repo/cmd/server'
        ]
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual(['pkg/auth', 'internal/db', 'cmd/server'])
    })

    it('filters out empty suffixes when import exactly matches module path', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: [
          'github.com/example/repo', // This should be filtered out as empty suffix
          'github.com/example/repo/pkg/auth',
          'github.com/other/library'
        ]
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual(['pkg/auth'])
    })

    it('handles multiple levels of nested paths', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: [
          'github.com/example/repo/pkg/auth/jwt',
          'github.com/example/repo/internal/db/models/user',
          'github.com/example/repo/cmd/server/handlers',
          'fmt',
          'os'
        ]
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual([
        'pkg/auth/jwt',
        'internal/db/models/user',
        'cmd/server/handlers'
      ])
    })

    it('returns empty array when no imports match module path', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: ['github.com/other/library', 'fmt', 'os', 'net/http']
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual([])
    })

    it('returns empty array when Imports array is empty', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: []
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual([])
    })

    it('handles partial matches correctly (startsWith behavior)', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: [
          'github.com/example/repo-extended/pkg',
          'github.com/example/repo/pkg/auth'
        ]
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual(['pkg/auth'])
    })

    it('handles imports with exact module path boundaries', () => {
      const goModInfo: GoModInfo = {
        Module: {
          Path: 'github.com/example/repo'
        },
        Imports: [
          'github.com/example/repo/v2/pkg', // Different version - should match
          'github.com/example/repo-fork/pkg', // Fork repo - should match due to startsWith
          'github.com/example/other-repo/pkg', // Different repo - should not match
          'github.com/example/repo/internal'
        ]
      }

      const result = makeImportSuffix(goModInfo)
      expect(result).toEqual(['v2/pkg', 'internal'])
    })
  })
})
