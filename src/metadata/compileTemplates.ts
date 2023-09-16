import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES, VIEWS } from './constants'

const IMPORT_REGEX = /--\s*#import\s+(\S+\.sql)/g

const compileTemplates = async (
  directory: string,
  viewFileName: string,
  templates: Map<string, Template>
) => {
  const viewFilePath = path.join(VIEWS, viewFileName)
  const viewFullFilePath = path.join(directory, viewFilePath)

  const compile = async (
    filePath: string,
    fileContent: string
  ): Promise<string> => {
    const imports = [...fileContent.matchAll(IMPORT_REGEX)].map(
      async (match) => {
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
        const compiledTemplate = await compile(
          templateFilePath,
          template.content
        )
        return prepareQuery(compiledTemplate)
      }
    )

    const compiledImports = await Promise.all(imports)
    return `${compiledImports.join('')}${prepareQuery(fileContent)}`
  }

  const content = await fs.readFile(viewFullFilePath, 'utf-8')
  return await compile(viewFilePath, content)
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
  let stats
  try {
    stats = await fs.stat(templatesPath)
  } catch (err) {
    return new Map<string, Template>()
  }
  if (!stats.isDirectory()) {
    console.warn(`${templatesPath} is not a directory`)
    return new Map<string, Template>()
  }

  const dir = await fs.opendir(templatesPath, { recursive: true })
  const templates = new Map<string, Template>()
  for await (const dirent of dir)
    if (dirent.isFile()) {
      const filePath = dirent.path
      const content = await fs.readFile(filePath, 'utf-8')
      if (path.extname(filePath) === '.sql')
        templates.set(path.relative(templatesPath.toString(), filePath), {
          filePath,
          content
        })
    }

  return templates
}

type Template = {
  filePath: string
  content: string
  root?: string
  lastProccessedBy?: string
}

export default compileTemplates
