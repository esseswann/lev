import { join } from 'path'
import { compileViews } from '../../src/metadata/compileViews'

describe('compile view', () => {
  jest.spyOn(console, 'warn').mockImplementation()

  const viewsPath = join(__dirname, 'basicTemplates/views')
  const templatesPath = join(__dirname, 'basicTemplates/templates')

  it('compiles views', async () => {
    const views: string[] = []
    for await (const { result } of compileViews(viewsPath, templatesPath))
      views.push(result)
    const targetViews = [
      'declare $connectionId as Utf8;declare $role as Utf8;declare $kek as Optional<List<Struct<test:Utf8,plest:Utf8>>>;declare $input as Struct<from:Optional<Datetime>,to:Optional<Datetime>,limit:Optional<Uint64>>;select $connectionId;select $role;'
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
