import { Template, Templates } from './getTemplates'
import { extractSections, mergeDeclares } from './templateSections'

const IMPORT_REGEX = /--\s*import\s+(\S+\.sql)/g

export const compileTemplates = (
  templates: Templates,
  path: Set<string>,
  template: Template
) => {
  const matches = template.content.matchAll(IMPORT_REGEX)
  const result = extractSections(template.content)
  let compiledTemplates = ''
  for (const match of matches) {
    const compiled = compileTemplate(templates, new Set(path), match[1])
    if (compiled) {
      result.declares = mergeDeclares(result.declares, compiled.declares)
      compiledTemplates += compiled.body
    }
  }
  result.body = compiledTemplates + result.body
  return result
}

export const compileTemplate = (
  templates: Templates,
  path: Set<string>,
  name: string
) => {
  // FIXME should not return null
  const template = templates.get(name)
  if (!template) throw new Error(`Template ${name} does not exist`)
  if (path.has(name))
    throw new Error(`Recursion detected for ${name} in ${getPath(path)}`)
  path.add(name)
  if (template.processedByPath.length) {
    console.warn(
      `${name} has already been imported in ${template.processedByPath}, skipping`
    )
    return null
  } else {
    template.processedByPath = getPath(path)
  }
  return compileTemplates(templates, path, template)
}

const getPath = (path: Set<string>) => [...path.values()].join('/')
