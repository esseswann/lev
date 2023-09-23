import { isLeft } from 'fp-ts/lib/These'
import fs from 'fs/promises'
import { PathReporter } from 'io-ts/lib/PathReporter'
import path from 'path'
import yaml from 'yaml'
import { EntityConfig, Schema } from '.'
import compileView, { compileViews } from './compileViews'
import { CONFIGS, QUERY, TEMPLATES, VIEWS } from './constants'
import getTemplates from './getTemplates'

async function processMetadata(directory: string): Promise<Schema> {
  const schema: Schema = new Map()

  await processViews(directory, schema)
  await processConfigs(directory, schema)

  return schema
}

async function processViews(directory: string, schema: Schema) {
  const viewsPath = path.join(directory, VIEWS)
  const templatesPath = path.join(directory, TEMPLATES)

  for await (const view of compileViews(viewsPath, templatesPath)) {
    checkView('kek', view)
  }

  for await (const { name, extension, content } of iterateDirectory(
    viewsPath
  )) {
    checkView(name, content) // FIXME: assuming checkView doesn't have side effects

    try {
      const { view, unusedTemplates: currentUnusedTemplates } =
        await compileView(templates, content)

      for (const template of currentUnusedTemplates) {
        unusedTemplates.add(template)
      }

      schema.set(`${QUERY}.${name}`, {
        view,
        name,
        cardinality: 'many',
        mapping: []
      })
    } catch (err) {
      throw new Error(`View ${name}: ${(err as Error).message}`)
    }
  }

  if (unusedTemplates.size)
    console.warn(
      `The following templates are not used: ${[...unusedTemplates].join(', ')}`
    )
}

const checkView = (name: string, str: string) => {
  if (!str.includes(`$${name} `))
    throw new Error(
      `View ${name} should contain select expression assigned to $${name} so that target result set is distinguished from other expressions`
    )
}

async function processConfigs(directory: string, schema: Schema) {
  const configsPath = path.join(directory, CONFIGS)

  try {
    await fs.access(configsPath)
  } catch (err) {
    console.warn(
      `Directory ${configsPath} does not exist. Skipping configs processing.`
    )
    return
  }

  for await (const { name, content } of iterateDirectory(configsPath)) {
    const config = fromYaml(content)

    for (const [key, relationship] of Object.entries(config.relationships)) {
      const target = schema.get(`${QUERY}.${relationship.name}`)

      if (!target) throw new Error(`No view present for ${relationship.name}`)

      const relationshipConfig = {
        ...relationship,
        view: target.view
      }

      schema.set(`${name}.${key}`, relationshipConfig)
    }
  }
}

async function* iterateDirectory(directory: string) {
  const files = await fs.readdir(directory)
  for (const filename of files) {
    const extension = path.extname(filename)
    const name = path.basename(filename, extension)
    const content = await fs.readFile(path.join(directory, filename), 'utf-8')
    yield { name, extension, content }
  }
}

const fromYaml = (input: string) => {
  const json = yaml.parse(input)
  const result = EntityConfig.decode(json)
  if (isLeft(result)) throw new Error(PathReporter.report(result).join('\n'))
  return result.right
}

export default processMetadata
