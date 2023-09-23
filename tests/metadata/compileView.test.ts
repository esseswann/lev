import { join } from 'path'
import cleanQuery from '../../src/metadata/cleanQuery'
import { compileViews } from '../../src/metadata/compileViews'

describe('compile view', () => {
  jest.spyOn(console, 'warn').mockImplementation()

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
    const views: string[] = []
    for await (const view of compileViews(viewsPath, templatesPath))
      views.push(view)
    const targetViews = [
      'declare $connectionId as Utf8;declare $role as Utf8;select $role;'
    ]
    expect(views).toEqual(targetViews)
  })

  it('warns about unused templates', async () => {
    global.console = { ...global.console, warn: jest.fn() }
    for await (const view of compileViews(viewsPath, templatesPath)) view
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('The following templates were unused: unused.sql')
    )
  })

  it('warns about already imported', async () => {
    const viewsPath = join(__dirname, 'doubleTemplates/views')
    const templatesPath = join(__dirname, 'doubleTemplates/templates')
    for await (const view of compileViews(viewsPath, templatesPath)) view
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'role.sql has already been imported in view.sql/role.sql, skipping'
      )
    )
  })
})
