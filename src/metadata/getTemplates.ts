import { Dir, PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'

export const getTemplates = async (templatesPath: PathLike) => {
  const templates = new Map<string, Template>()

  let dir: Dir

  try {
    dir = await fs.opendir(templatesPath, { recursive: true })
  } catch (e) {
    console.warn(`No directory found at ${templatesPath}`)
    return templates
  }

  for await (const dirent of dir)
    if (dirent.isFile()) {
      const filePath = dirent.path
      if (path.extname(filePath) !== '.sql') continue
      const content = await fs.readFile(filePath, 'utf-8')
      templates.set(path.relative(templatesPath.toString(), filePath), {
        filePath,
        content,
        processedByPath: new Set()
      })
    }

  return templates
}

export const resetTemplates = (templates: Templates) => {
  const unusedTemplates = []
  for (const [name, template] of templates.entries()) {
    if (template.processedByPath.size === 0) unusedTemplates.push(name)
    else {
      template.processedByPath = new Set()
      templates.set(name, template)
    }
  }
  return unusedTemplates
}

export type Template = {
  filePath: string
  content: string
  processedByPath: Set<string>
}

export type Templates = Map<string, Template>
