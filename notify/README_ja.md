# `ikura-hamu/go-import-pages/notify`

Go のモジュールの変更をリダイレクト用の HTML を管理するリポジトリに、Issue のコメントを使って通知します。

## 入力

| 名前           | 必須 | 説明                                                                                                                                           | デフォルト |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `owner`        | Yes  | HTML を管理するリポジトリのオーナー名                                                                                                          |            |
| `repo_name`    | Yes  | HTML を管理するリポジトリ名                                                                                                                    |            |
| `issue_number` | Yes  | 通知する Issue の番号                                                                                                                          |            |
| `github_token` | Yes  | GitHub API を呼び出すための GitHub Personal Access Token もしくは GitHub App Token。 HTML を管理するリポジトリの `issues:write` スコープが必要 |            |

## 出力

なし
