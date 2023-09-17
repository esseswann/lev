import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES, VIEWS } from './constants'

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
    for (const match of matches) {
      const templateName = match[1]
      const template = templates.get(templateName)

      if (!template)
        throw new Error(
          `Template ${templateName} imported from ${filePath} does not exist.`
        )

      if (template.root === viewFilePath && template.lastProccessedBy)
        throw new Error(
          `Duplicate import encountered in ${filePath}.\nImported ${templateName} is already imported in ${template.lastProccessedBy}.`
        )

      template.root = viewFilePath
      template.lastProccessedBy = filePath

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

export const getTemplates = async (templatesPath: PathLike) => {
  const templates = new Map<string, Template>()

  try {
    const dir = await fs.opendir(templatesPath, { recursive: true })
    for await (const dirent of dir)
      if (dirent.isFile()) {
        const filePath = dirent.path
        if (path.extname(filePath) !== '.sql') continue
        const content = await fs.readFile(filePath, 'utf-8')
        templates.set(path.relative(templatesPath.toString(), filePath), {
          filePath,
          content
        })
      }
  } catch (err) {
    // FIXME: catch different error types
    console.warn(err)
  }

  return templates
}

type Template = {
  filePath: string
  content: string
  root?: string
  lastProccessedBy?: string
}

export default compileView
