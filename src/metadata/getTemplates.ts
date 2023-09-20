import { PathLike } from 'fs'
import fs from 'fs/promises'
import path from 'path'

const getTemplates = async (templatesPath: PathLike) => {
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

export type Template = {
  filePath: string
  content: string
  root?: string
  lastProccessedBy?: string
}

export default getTemplates