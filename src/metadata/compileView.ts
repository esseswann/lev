import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES, VIEWS } from './constants'
import { Template } from './getTemplates'

const IMPORT_REGEX = /--\s*#import\s+(\S+\.sql)/g

const compileView = async (
  directory: string,
  fileName: string,
  templates: Map<string, Template>
) => {
  const viewName = path.basename(fileName, path.extname(fileName))
  const viewFilePath = path.join(VIEWS, fileName)
  const viewFullFilePath = path.join(directory, viewFilePath)

  const compile = async (filePath: string, fileContent: string) => {
    let compiled: string = ''

    const matches = fileContent.matchAll(IMPORT_REGEX)
    // NOTE: One can rewrite `for of` loop with `map` to compile templates in parallel.
    for (const match of matches) {
      const templateName = match[1]
      const template = templates.get(templateName)

      if (!template)
        throw new Error(
          `Template ${templateName} imported from ${filePath} does not exist.`
        )

      if (template.root === viewFilePath && template.lastProcessedBy)
        throw new Error(
          `Duplicate import encountered in ${filePath}.\nImported ${templateName} is already imported in ${template.lastProcessedBy}.`
        )

      template.root = viewFilePath
      template.lastProcessedBy = filePath

      const templateFilePath = path.join(TEMPLATES, templateName)
      const compiledTemplate = await compile(templateFilePath, template.content)
      const preparedTemplate = prepareQuery(compiledTemplate)
      compiled += preparedTemplate
    }

    const preparedContent = prepareQuery(fileContent)
    compiled += preparedContent
    return compiled
  }

  const viewContent = await fs.readFile(viewFullFilePath, 'utf-8')
  checkView(viewName, viewContent) // FIXME: assuming checkView doesn't have side effects
  return await compile(viewFilePath, viewContent)
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
