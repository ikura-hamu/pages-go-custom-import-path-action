# `ikura-hamu/go-import-pages/update`

Generates redirect HTML files, saves them to the specified directory, and
commits and pushes the changes.

## Inputs

| Name           | Required | Description                                                                                                                                         | Default  |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `payload`      | Yes      | JSON format payload                                                                                                                                 |          |
| `pages_dir`    | No       | Directory to save HTML files                                                                                                                        | `.`      |
| `change_type`  | No       | Type of change. If `commit`, commits directly to the current branch. If `pr`, creates a new branch and creates a Pull Request to the default branch | `commit` |
| `github_token` | Yes      | Token for calling GitHub API. Requires `contents:write` scope                                                                                       |          |

### About `payload`

```json
{
  "owner": "<owner>",
  "repoName": "<repository name>",
  "goModInfo": {
    "Module": {
      "Path": "<module path>"
    },
    "Imports": ["<imported package path>"]
  }
}
```

`goModInfo` is the output when running `go list -json=Module,Imports .` in the
module directory.

## Outputs

None
