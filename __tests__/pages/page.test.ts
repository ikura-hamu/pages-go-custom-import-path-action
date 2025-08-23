import { generateTemplate, TemplateConfig } from '../../src/update/page.js'
import { JSDOM } from 'jsdom'

describe('generateTemplate', () => {
  it('should generate a template with the correct frontmatter', () => {
    const config: TemplateConfig = {
      importPrefix: 'example.com/mod',
      owner: 'example',
      repoName: 'repo'
    }

    const expectHtmlStr = `<!DOCTYPE html>
<html>
  <head>
    <meta
      name="go-import"
      content="${config.importPrefix} git https://github.com/${config.owner}/${config.repoName}.git"
    />
    <meta charset="utf-8" />
    <meta
      http-equiv="refresh"
      content="0; url=https://pkg.go.dev/${config.importPrefix}"
    />
  </head>
  <body>
    Redirecting to
    <a href="https://pkg.go.dev/${config.importPrefix}"
      >https://pkg.go.dev/${config.importPrefix}</a
    >...
  </body>
</html>`
    const expected = new JSDOM(expectHtmlStr)
    const result = generateTemplate(config)

    const findGoMeta = (dom: JSDOM) =>
      dom.window.document.querySelector("head meta[name='go-import']")
    const expectedGoImport = findGoMeta(expected)
    const resultGoImport = findGoMeta(result)

    expect(resultGoImport).toBeTruthy()
    expect(resultGoImport?.getAttribute('content')).toBe(
      expectedGoImport?.getAttribute('content')
    )

    const findHttpEquiv = (dom: JSDOM) =>
      dom.window.document.querySelector("head meta[http-equiv='refresh']")
    const expectedHttpEquiv = findHttpEquiv(expected)
    const resultHttpEquiv = findHttpEquiv(result)

    expect(resultHttpEquiv).toBeTruthy()
    expect(resultHttpEquiv?.getAttribute('content')).toBe(
      expectedHttpEquiv?.getAttribute('content')
    )
  })
})
