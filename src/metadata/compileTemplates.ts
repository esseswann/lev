import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'

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
}
