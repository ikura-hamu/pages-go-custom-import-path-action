# `ikura-hamu/go-import-pages/update`

リダイレクト用の HTML ファイルを生成して、指定されたディレクトリに保存し、コミット、プッシュします。

## 入力

| 名前           | 必須 | 説明                                                                                                                                   | デフォルト |
| -------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `payload`      | Yes  | JSON形式のペイロード                                                                                                                   |            |
| `pages_dir`    | No   | HTMLファイルを保存するディレクトリ                                                                                                     | `.`        |
| `change_type`  | No   | 変更の種類。 `commit` ならば現在のブランチに直接コミット、`pr`ならば新しいブランチを作成してデフォルトブランチへの Pull Request を作成 | `commit`   |
| `github_token` | Yes  | GitHub APIを呼び出すためのトークン。 `contents:write` スコープが必要                                                                   |            |

### `payload` について

```json
{
  "owner": "<owner>",
  "repoName": "<repository name>",
  "goModInfo": {
    "Module": {
      "Path": "<module path>",
    },
    "Imports": [
      "<imported package path>"
    ]
  }
}
```

`goModInfo` はモジュールのディレクトリで `go list -json=Module,Imports .` を実行したときの出力です。

## 出力

なし
