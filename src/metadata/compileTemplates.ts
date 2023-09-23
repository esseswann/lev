import cleanQuery from './cleanQuery'
import { Template, Templates } from './getTemplates'

const IMPORT_REGEX = /--\s*import\s+(\S+\.sql)/g

export const compileTemplates = (
  templates: Templates,
  path: Set<string>,
  template: Template
) => {
  const matches = template.content.matchAll(IMPORT_REGEX)
  let result = ''
  for (const match of matches)
    result += compileTemplate(templates, new Set(path), match[1])
  return result + cleanQuery(template.content)
}

export const compileTemplate = (
  templates: Templates,
  path: Set<string>,
  name: string
): string => {
  const template = templates.get(name)
  if (!template) throw new Error(`Template ${name} does not exist`)
  if (path.has(name))
    throw new Error(`Recursion detected for ${name} in ${getPath(path)}`)
  path.add(name)
  if (template.processedByPath.length) {
    console.warn(
      `${name} has already been imported in ${template.processedByPath}, skipping`
    )
    return ''
  } else {
    template.processedByPath = getPath(path)
  }
  return compileTemplates(templates, path, template)
}

const getPath = (path: Set<string>) => [...path.values()].join('/')
