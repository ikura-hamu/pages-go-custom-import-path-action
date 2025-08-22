# Pages Module - Unit Test Guide

This module has been refactored to be unit test-friendly while maintaining
simplicity and avoiding over-engineering.

## Module Structure

### `content.ts`

- **Pure functions** for payload validation and import suffix extraction
- `validatePayload()` - Validates input payload with clear error messages
- `makeImportSuffix()` - Extracts import suffixes (pure function, easy to test)

### `options.ts`

- **Dependency injection** for input reading
- `InputReader` interface allows mocking of `@actions/core` in tests
- `validateOptions()` - Pure validation function
- `loadOptions()` - Configurable options loader

### `page.ts`

- **Dependency injection** for file system operations
- `FileSystemWriter` interface allows mocking of file operations
- `generateTemplate()` - Pure HTML generation function
- `generateFilePaths()` - Pure path generation function
- `saveFile()` - Orchestrates file saving with injectable dependencies

### `main.ts`

- **Improved error handling** with specific error messages
- **Logging** for better debugging
- **Structured flow** with clear separation of concerns

## Testing Strategies

### Testing Pure Functions

```typescript
// Example: Testing makeImportSuffix
import { makeImportSuffix } from './content.js'

test('makeImportSuffix extracts correct suffixes', () => {
  const goModInfo = {
    Module: { Path: 'github.com/user/repo' },
    Imports: [
      'github.com/user/repo/cmd',
      'github.com/user/repo/pkg/utils',
      'other.com/different'
    ]
  }

  const result = makeImportSuffix(goModInfo)
  expect(result).toEqual(['cmd', 'pkg/utils'])
})
```

### Testing with Dependency Injection

```typescript
// Example: Testing options loading
import { loadOptions, InputReader } from './options.js'

class MockInputReader implements InputReader {
  private inputs: Record<string, string> = {}

  setInput(name: string, value: string) {
    this.inputs[name] = value
  }

  getInput(name: string): string {
    return this.inputs[name] || ''
  }
}

test('loadOptions with custom input', () => {
  const mockReader = new MockInputReader()
  mockReader.setInput('pages_dir', 'custom-dir')

  const options = loadOptions(mockReader)
  expect(options.pagesDir).toBe('custom-dir')
})
```

### Testing File Operations

```typescript
// Example: Testing file saving
import { saveFile, FileSystemWriter } from './page.js'

class MockFileSystemWriter implements FileSystemWriter {
  public writtenFiles: Record<string, string> = {}
  public createdDirectories: string[] = []

  writeFile(filePath: string, content: string): void {
    this.writtenFiles[filePath] = content
  }

  createDirectory(dirPath: string): void {
    this.createdDirectories.push(dirPath)
  }
}

test('saveFile creates correct files', () => {
  const mockWriter = new MockFileSystemWriter()
  const payload = {
    /* ... */
  }
  const options = { pagesDir: 'test-dir' }

  saveFile(payload, options, 'cmd', mockWriter)

  expect(mockWriter.createdDirectories).toContain('test-dir/cmd')
  expect(mockWriter.writtenFiles['test-dir/cmd/index.html']).toContain(
    'go-import'
  )
})
```

## Key Testing Benefits

1. **Pure Functions**: Easy to test with various inputs and edge cases
2. **Dependency Injection**: Allows mocking of external dependencies (file
   system, actions core)
3. **Clear Separation**: Each function has a single responsibility
4. **Error Validation**: Comprehensive error cases can be tested
5. **Type Safety**: TypeScript types ensure test correctness

## Running Tests

```bash
npm run test
```

The refactored code maintains the same functionality while being much more
testable and maintainable.
