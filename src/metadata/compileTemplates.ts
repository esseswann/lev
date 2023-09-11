import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'

const IMPORT_REGEX = /--\s*#import\s+(\S+\.sql)/g

const compileTemplates = async (
  rootFileName: string,
  templates: Map<string, Template>,
  fileName: string,
  fileContent: string
) => {
  let compiled: string = ''
  const matches = [...fileContent.matchAll(IMPORT_REGEX)]
  for (const match of matches) {
    const templateName = match[1]
    const template = templates.get(templateName)
    if (template === undefined)
      throw new Error(
        `Template ${templateName} imported from ${fileName} does not exist.`
      )
    if (template.root === rootFileName) {
      const lastProccessedBy = template!.lastProccessedBy
      throw new Error(
        `Duplicate import encounted in ${fileName}.\nImported ${templateName} is already imported in ${lastProccessedBy}.`
      )
    } else {
      template.root = rootFileName
      template.lastProccessedBy = fileName
    }

    compiled +=
      '\n' +
      (await compileTemplates(
        rootFileName,
        templates,
        templateName,
        template.content
      ))
  }

  return (compiled += '\n' + fileContent)
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
