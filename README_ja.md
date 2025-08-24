# go-import-pages

`go-import-pages` は、Goの import
path のリダイレクトを行い自由なドメインを使った import path を GitHub
Pages で実現するための GitHub Actions のアクションを提供します。

## 提供する Actions

2つの Actions を提供しています。詳細な使い方はそれぞれのREADME.mdを参照してください。

| Action                                        | 説明                                                      |
| --------------------------------------------- | --------------------------------------------------------- |
| [ikura-hamu/go-import-pages/notify](./notify) | HTML を管理しているリポジトリにモジュールの変更を通知する |
| [ikura-hamu/go-import-pages/update](./update) | HTML を管理しているリポジトリを更新する                   |

## 仕組み

Go の import
path は、GitHub のリポジトリの URL がそのまま使われることが多いですが、好みのドメインを使っても HTML の meta タグを使ってリポジトリの URL を指定することで import
path として利用できます。

参考: https://pkg.go.dev/cmd/go#hdr-Remote_import_paths

Go のモジュールの情報からこの meta タグを含む HTML ファイルを生成し、それを GitHub
Pages のカスタムドメインを使って配信することで、任意のドメインを使った import
path を実現します。

このリポジトリ以外の方法として、動的にHTMLを配信するサーバーアプリ実装の
[rsc.io/go-import-redirector](https://github.com/rsc/go-import-redirector)
があります。

## 使い方

1つのドメインに対していくつのモジュールを紐づけるかによって使い方が変わります。

### 1つのドメインに対して複数のモジュールを紐づける場合

例えば `example.com/mod1` と `example.com/mod2`
のように、1つのドメインに対して複数のモジュールを紐づける場合は、ソースコードを管理するリポジトリの他に、HTMLを管理するリポジトリが必要です。

モジュールを管理しているリポジトリを `github.com/{username}/{mod_repo}`
、HTMLを管理しているリポジトリを `github.com/{username}/{html_repo}` とします。

#### HTMLを管理しているリポジトリの準備

モジュールを管理しているリポジトリからの更新通知を Issue のコメントを使って受け取ります。そのための空の Issue を1つ作成してください。

HTMLを管理しているリポジトリでは、以下のようなワークフローを記述します。

```yaml
on:
  issue_comment:
    types: [created]

permissions:
  contents: write

jobs:
  update_repo:
    if: github.event.issue.number == 10
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - uses: ikura-hamu/go-import-pages/update@v0.1
        with:
          payload: ${{ github.event.comment.body }}
          pages_dir: 'dist'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  pages:
    runs-on: ubuntu-latest
    needs: update_repo
    permissions:
      pages: write
      contents: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Job の条件には、作成した Issue の番号を指定してください。

このリポジトリの GitHub Pages を使って HTML を配信するので、GitHub
Pages を有効にして、自分が使いたいドメインを指定してください。

詳細:
[GitHub Pages サイトのカスタムドメインを設定する](https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site)

#### モジュールを管理しているリポジトリの準備

モジュールを管理しているリポジトリでは、以下のようなワークフローを記述します。

```yaml
on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup Go
        uses: actions/setup-go@v5

      - name: Notify
        uses: ikura-hamu/go-import-pages/notify@v0.1
        with:
          owner: { username }
          repo_name: { html_repo }
          github_token: ${{ secrets.GH_PAT }}
          issue_number: 10
```

`github_token` には、HTMLを管理しているリポジトリに対して `issues:write`
の権限を持つ GitHub Personal Access Token、もしくは GitHub App
Token を指定してください。

`issue_number`
には、HTMLを管理しているリポジトリで作成した Issue の番号を指定してください。この番号を

### 1つのドメインに対して1つのモジュールを紐づける場合

`example.com`
のようなドメインに対してモジュールを1つだけ紐づける場合は、HTMLを管理しているリポジトリは不要です。

未実装です
