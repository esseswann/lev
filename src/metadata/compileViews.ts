import { PathLike } from 'fs'
import fs from 'fs/promises'
import { compileTemplate } from './compileTemplates'
import {
  Template,
  Templates,
  getTemplate,
  getTemplates,
  resetTemplates
} from './getTemplates'

export async function* compileViews(
  viewsPath: PathLike,
  templatesPath?: PathLike
) {
  let templates: Templates = new Map<string, Template>()
  if (templatesPath)
    try {
      templates = await getTemplates(templatesPath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  const unusedTemplates = []
  const dir = await fs.opendir(viewsPath)
  for await (const dirent of dir) {
    const name = dirent.name
    const templateLikeView = await getTemplate(dirent)
    templates.set(name, templateLikeView)
    const result = compileTemplate(templates, new Set(), name)
    templates.delete(name)
    unusedTemplates.push(...resetTemplates(templates))
    yield { name, result }
  }
  if (unusedTemplates.length) {
    const set = new Set(unusedTemplates)
    console.warn(`The following templates were unused: ${[...set]}`)
  }
}
