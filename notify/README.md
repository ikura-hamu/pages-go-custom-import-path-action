# `ikura-hamu/go-import-pages/notify`

Notifies changes to Go modules to a repository that manages redirect HTML using
Issue comments.

## Inputs

| Name           | Required | Description                                                                                                                                 | Default |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `owner`        | Yes      | Owner name of the repository that manages HTML                                                                                              |         |
| `repo_name`    | Yes      | Repository name that manages HTML                                                                                                           |         |
| `issue_number` | Yes      | Issue number to notify                                                                                                                      |         |
| `github_token` | Yes      | GitHub Personal Access Token or GitHub App Token for calling GitHub API. Requires `issues:write` scope for the repository that manages HTML |         |

## Outputs

None
