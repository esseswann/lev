import { Template } from './getTemplates'

const IMPORT_REGEX = /--\s*#import\s+(\S+\.sql)/g

const compileView = async (
  templates: Map<string, Template>,
  viewContent: string
) => {
  const processedTemplates = new Map<string, string>()

  const compile = async (name: string, str: string) => {
    let compiled: string = ''
    const matches = str.matchAll(IMPORT_REGEX)

    // NOTE: One can rewrite `for of` loop with `map` to compile templates in parallel.
    for (const match of matches) {
      const templateName = match[1]
      const template = templates.get(templateName)

      if (!template)
        throw new Error(
          name.length
            ? `Template ${templateName} imported from template ${name} does not exist.`
            : `Imported template ${templateName} does not exist.`
        )

      const lastProcessedBy = processedTemplates.get(templateName)
      if (lastProcessedBy !== undefined) {
        const msg1 = name.length
          ? `Duplicate import encountered in ${name}.`
          : `Duplicate import encountered.`
        const msg2 = lastProcessedBy.length
          ? `Imported ${templateName} is already imported in ${lastProcessedBy}.`
          : `Imported ${templateName} is already imported.`
        throw new Error(`${msg1}\n${msg2}`)
      }

      processedTemplates.set(templateName, name)

      const compiledTemplate = await compile(templateName, template.content)
      const preparedTemplate = prepareQuery(compiledTemplate)
      compiled += preparedTemplate
    }

    const preparedContent = prepareQuery(str)
    compiled += preparedContent

    return compiled
  }

  const view = await compile('', viewContent)
  const unusedTemplates = new Set<string>()
  for (const key of templates.keys()) {
    if (!processedTemplates.has(key)) {
      unusedTemplates.add(key)
    }
  }
  return { view, unusedTemplates }
}

export const prepareQuery = (str: string) => {
  let cleaned = str
    .replace(/--.*/g, '') // remove single line comments
    .replace(/\/\*[^]*?\*\//g, '') // remove multi-line comments
    .replace(/\s{1,}/g, ' ') // minify
    .trim()
  if (cleaned[cleaned.length - 1] !== ';') cleaned += ';'
  return cleaned
}

export default compileView
