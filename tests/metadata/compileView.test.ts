import { join } from 'path'
import cleanQuery from '../../src/metadata/cleanQuery'
import {
  Templates,
  compileTemplates
} from '../../src/metadata/compileTemplates'
import getTemplates from '../../src/metadata/getTemplates'

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
})

describe('compile template', () => {
  const base = __dirname

  it('should compile template', async () => {
    const path = join(base, 'basicTemplates/templates')
    const templates = await getTemplates(path)
    const template = templates.get('role.sql')!
    template.processedByPath.add('root')
    const result = compileTemplates(templates, template)
    templates.forEach(({ filePath, processedByPath }) =>
      console.log(filePath, processedByPath.size)
    )
    expect(result).toContain('connectionId') // FIXME
  })

  it('should throw recursive exception', async () => {
    const path = join(base, 'recursiveTemplates/templates')
    const templates = await getTemplates(path)
    const template = templates.get('role.sql')!
    template.processedByPath.add('root')
    const t = () => compileTemplates(templates, template)
    expect(t).toThrow(
      'Template connection.sql has already been imported in path connection.sql'
    )
  })
})
