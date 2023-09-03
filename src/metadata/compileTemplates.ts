import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'

export const getTemplates = async (templatesPath: PathLike) => {
  const dir = await fs.opendir(templatesPath, { recursive: true })
  const templates = new Map<string, Template>()
  for await (const dirent of dir)
    if (dirent.isFile()) {
      const filePath = dirent.path
      if (path.extname(filePath) === '.sql')
        templates.set(dirent.name, { filePath })
    }

  return templates
}

type Template = {
  filePath: string
  root?: string
}
