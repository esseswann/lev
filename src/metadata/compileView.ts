import { compileTemplates } from './compileTemplates'
import { Template, Templates } from './getTemplates'

const compileView = (
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

export default compileView
