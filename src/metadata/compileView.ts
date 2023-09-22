import { Template } from './getTemplates'

const IMPORT_REGEX = /--\s*#import\s+(\S+\.sql)/g

const compileView = async (
  viewName: string,
  viewContent: string,
  templates: Map<string, Template>
) => {
  const compile = async (name: string, str: string) => {
    let compiled: string = ''

    const matches = str.matchAll(IMPORT_REGEX)
    // NOTE: One can rewrite `for of` loop with `map` to compile templates in parallel.
    for (const match of matches) {
      const templateName = match[1]
      const template = templates.get(templateName)

      if (!template)
        throw new Error(
          `Template ${templateName} imported from ${name} does not exist.`
        )

      if (template.root === viewName && template.lastProcessedBy)
        throw new Error(
          `Duplicate import encountered in ${name}.\nImported ${templateName} is already imported in ${template.lastProcessedBy}.`
        )

      template.root = viewName
      template.lastProcessedBy = name

      const compiledTemplate = await compile(templateName, template.content)
      const preparedTemplate = prepareQuery(compiledTemplate)
      compiled += preparedTemplate
    }

    const preparedContent = prepareQuery(str)
    compiled += preparedContent
    return compiled
  }

  checkView(viewName, viewContent) // FIXME: assuming checkView doesn't have side effects
  return await compile(viewName, viewContent)
}

const checkView = (name: string, str: string) => {
  if (!str.includes(`$${name} `))
    throw new Error(
      `View ${name} should contain select expression assigned to $${name} so that target result set is distinguished from other expressions`
    )
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
