import { Dirent, PathLike } from 'fs'
import fs from 'fs/promises'
import { compileTemplate, compileTemplates } from './compileTemplates'
import { Template, getTemplates, resetTemplates } from './getTemplates'

export async function* compileViews(
  viewsPath: PathLike,
  templatesPath?: PathLike
) {
  const templates = templatesPath
    ? await getTemplates(templatesPath)
    : new Map()
  const unusedTemplates = []
  const views = await fs.opendir(viewsPath)
  for await (const view of views) {
    const name = view.name
    const templateLikeView = await getTemplateLikeView(view)
    templates.set(name, templateLikeView)
    const result = compileTemplate(templates, new Set(), name)
    templates.delete(name)
    unusedTemplates.push(...resetTemplates(templates))
    yield result
  }
  if (unusedTemplates.length) {
    const set = new Set(unusedTemplates)
    console.warn(`The following templates were unused: ${[...set]}`)
  }
}

const getTemplateLikeView = async (dirent: Dirent): Promise<Template> => {
  const filePath = dirent.path
  const content = await fs.readFile(filePath, 'utf-8')
  return { filePath, content, processedByPath: '' }
}
