import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES, VIEWS } from './constants'

const IMPORT_REGEX = /--\s*#import\s+(\S+\.sql)/g

const compileTemplates = async (
  directory: string,
  viewName: string,
  templates: Map<string, Template>
) => {
  const rootFilePath = path.join(VIEWS, viewName)

  const compile = async (filePath: string, fileContent: string) => {
    let compiled: string = ''

    const matches = [...fileContent.matchAll(IMPORT_REGEX)]
    for (const match of matches) {
      const templateName = match[1]
      const template = templates.get(templateName)

      if (!template)
        throw new Error(
          `Template ${templateName} imported from ${filePath} does not exist.`
        )

      if (template.root === filePath)
        throw new Error(
          `Duplicate import encounted in ${filePath}.\nImported ${templateName} is already imported in ${template.lastProccessedBy}.`
        )

      template.root = rootFilePath
      template.lastProccessedBy = filePath

      const templateContent = await compile(
        path.join(TEMPLATES, templateName),
        template.content
      )

      compiled += `\n${templateContent}`
    }

    return `${compiled}\n${fileContent}`
  }

  const content = await fs.readFile(path.join(directory, rootFilePath), 'utf-8')
  return await compile(rootFilePath, content)
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
