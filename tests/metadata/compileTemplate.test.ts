import { join } from 'path'
import { compileTemplate } from '../../src/metadata/compileTemplates'
import { getTemplates } from '../../src/metadata/getTemplates'

describe('compile template', () => {
  const base = __dirname

  it('should compile template', async () => {
    const path = join(base, 'basicTemplates/templates')
    const templates = await getTemplates(path)
    const result = compileTemplate(templates, new Set(['root']), 'role.sql')
    expect(result).toContain('connectionId') // FIXME
  })

  it('should throw recursive exception', async () => {
    const path = join(base, 'recursiveTemplates/templates')
    const templates = await getTemplates(path)
    const t = () => compileTemplate(templates, new Set(), 'role.sql')
    expect(t).toThrow(
      'Recursion detected for role.sql in role.sql/connection.sql'
    )
  })
})
