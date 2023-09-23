import fs from 'fs/promises'
import { join } from 'path'
import cleanQuery from '../../src/metadata/cleanQuery'
import compileView from '../../src/metadata/compileView'
import getTemplates, { resetTemplates } from '../../src/metadata/getTemplates'

describe('cleanQuery', () => {
  it('appends a semicolon if not present', () => {
    const input = '$foobar = select * from `foo/bar`'
    const expected = '$foobar = select * from `foo/bar`;'

    const result = cleanQuery(input)

    expect(result).toBe(expected)
  })

  it('minifies a SQL query', () => {
    const input = `-- This is a single line comment
                   $foobar = select *
                               from \`foo/bar\`;
                   /* This is a
                      multi-line comment */`
    const expected = '$foobar = select * from `foo/bar`;'

    const result = cleanQuery(input)

    expect(result).toBe(expected)
  })

  const viewsPath = join(__dirname, 'basicTemplates/views')
  const templatesPath = join(__dirname, 'basicTemplates/templates')

  it('compiles views', async () => {
    const templates = await getTemplates(templatesPath)
    const views = await fs.opendir(viewsPath)
    for await (const view of views) {
      const filePath = view.path
      const content = await fs.readFile(filePath, 'utf-8')
      compileView(templates, { filePath, content })
    }
  })

  it('warns about unused templates', async () => {
    const templates = await getTemplates(templatesPath)
    const views = await fs.opendir(viewsPath)
    const unusedTemplates = []
    for await (const view of views) {
      const filePath = view.path
      const content = await fs.readFile(filePath, 'utf-8')
      compileView(templates, { filePath, content })
      unusedTemplates.push(...resetTemplates(templates))
    }
    const set = new Set(unusedTemplates)
    console.warn(`The following templates were unused: ${[...set]}`)
    expect(set).toEqual(new Set(['unused.sql']))
  })
})
