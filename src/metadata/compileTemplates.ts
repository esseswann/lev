import cleanQuery from './cleanQuery'
import { Template, Templates } from './getTemplates'

const IMPORT_REGEX = /--\s*import\s+(\S+\.sql)/g

export const compileTemplates = (templates: Templates, template: Template) => {
  const matches = template.content.matchAll(IMPORT_REGEX)
  let result = ''
  for (const match of matches) result += compileTemplate(templates, match[1])
  return result + cleanQuery(template.content)
}

export const compileTemplate = (templates: Templates, name: string): string => {
  const template = templates.get(name)
  if (!template) throw new Error(`Template ${name} does not exist`)
  const processedPath = template.processedByPath
  if (processedPath.has(name))
    throw new Error(
      `Template ${name} has already been imported in path ${[
        ...processedPath.values()
      ].join('')}`
    )
  processedPath.add(name)
  return compileTemplates(templates, template)
}
