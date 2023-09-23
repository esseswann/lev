import { PathLike } from 'fs'
import { compileTemplates } from './compileTemplates'
import {
  getTemplates,
  Template,
  Templates,
  resetTemplates
} from './getTemplates'
import fs from 'fs/promises'

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
    const filePath = view.path
    const content = await fs.readFile(filePath, 'utf-8')
    yield compileView(templates, { filePath, content })
    unusedTemplates.push(...resetTemplates(templates))
  }
  if (unusedTemplates.length) {
    const set = new Set(unusedTemplates)
    console.warn(`The following templates were unused: ${[...set]}`)
  }
}

export const compileView = (
  templates: Templates,
  view: Omit<Template, 'processedByPath'>
) => {
  const viewLikeTemplate: Template = {
    ...view,
    processedByPath: new Set([view.filePath])
  }
  const compiledView = compileTemplates(templates, viewLikeTemplate)
  return compiledView
}
