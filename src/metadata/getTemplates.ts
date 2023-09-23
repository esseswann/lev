import { Dirent, PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'

export const getTemplates = async (templatesPath: PathLike) => {
  const templates = new Map<string, Template>()
  const dir = await fs.opendir(templatesPath, { recursive: true })
  for await (const dirent of dir)
    if (dirent.isFile()) {
      const filePath = dirent.path
      if (path.extname(filePath) !== '.sql') continue
      const template = await getTemplate(dirent)
      templates.set(path.relative(templatesPath.toString(), filePath), template)
    }

  return templates
}

export const resetTemplates = (templates: Templates) => {
  const unusedTemplates = []
  for (const [name, template] of templates.entries()) {
    if (!template.processedByPath.length) unusedTemplates.push(name)
    else {
      template.processedByPath = ''
      templates.set(name, template)
    }
  }
  return unusedTemplates
}

export type Template = {
  filePath: string
  content: string
  processedByPath: string
}

export const getTemplate = async (dirent: Dirent): Promise<Template> => {
  const filePath = dirent.path
  const content = await fs.readFile(filePath, 'utf-8')
  return { filePath, content, processedByPath: '' }
}

export type Templates = Map<string, Template>
