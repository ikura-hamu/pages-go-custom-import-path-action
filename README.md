# go-import-pages

[日本語](./README_ja.md)

`go-import-pages` provides GitHub Actions to enable custom domain import paths
for Go modules by redirecting Go import paths using GitHub Pages.

## Provided Actions

We provide two Actions. Please refer to each README.md for detailed usage
instructions.

| Action                                        | Description                                                 |
| --------------------------------------------- | ----------------------------------------------------------- |
| [ikura-hamu/go-import-pages/notify](./notify) | Notify module changes to the repository managing HTML files |
| [ikura-hamu/go-import-pages/update](./update) | Update the repository managing HTML files                   |

## How it works

Go import paths often use GitHub repository URLs directly, but you can also use
custom domains by specifying the repository URL in HTML meta tags to use them as
import paths.

Reference: https://pkg.go.dev/cmd/go#hdr-Remote_import_paths

This repository generates HTML files containing these meta tags from Go module
information and serves them using GitHub Pages with a custom domain to achieve
import paths with arbitrary domains.

As an alternative to this repository, there's
[rsc.io/go-import-redirector](https://github.com/rsc/go-import-redirector),
which is a server application implementation that dynamically serves HTML.

## Usage

The usage varies depending on how many modules you want to associate with a
single domain.

### When associating multiple modules with one domain

For example, when associating multiple modules with one domain like
`example.com/mod1` and `example.com/mod2`, you need a separate repository to
manage HTML files in addition to the repository managing source code.

Let's assume the repository managing modules is
`github.com/{username}/{mod_repo}` and the repository managing HTML is
`github.com/{username}/{html_repo}`.

#### Preparing the repository managing HTML

This repository will receive update notifications from the repository managing
modules via Issue comments. Please create one empty Issue for this purpose.

In the repository managing HTML, write a workflow like the following:

```yaml
on:
  issue_comment:
    types: [created]

permissions:
  contents: write

jobs:
  jobs:
  update_repo:
    if: github.event.issue.number == 10
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - uses: ikura-hamu/go-import-pages/update@v0.1.0
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

Specify the issue number in the Job conditions.

Since this repository uses GitHub Pages to serve HTML, please enable GitHub
Pages and specify the domain you want to use.

Details:
[Configuring a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

#### Preparing the repository managing modules

In the repository managing modules, write a workflow like the following:

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
        uses: ikura-hamu/go-import-pages/notify@v0.1.0
        with:
          owner: { username }
          repo_name: { html_repo }
          github_token: ${{ secrets.GH_PAT }}
          issue_number: 10
```

For `github_token`, specify a GitHub Personal Access Token or GitHub App Token
with `issues:write` permission for the repository managing HTML.

For `issue_number`, specify the number of the Issue created in the repository
managing HTML.

### When associating one module with one domain

When associating only one module with a domain like `example.com`, you don't
need a separate repository to manage HTML.

Not implemented yet
