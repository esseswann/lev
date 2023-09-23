import { join } from 'path'
import { compileTemplates } from '../../src/metadata/compileTemplates'
import getTemplates from '../../src/metadata/getTemplates'

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
