import { promises as fs } from 'fs'
import path from 'path'
import yaml from 'yaml'

import { Relationship, Schema, prepareView } from './metadata'

const VIEWS = 'views'
const CONFIGS = 'configs'
const QUERY = 'query'

async function processMetadata(directory: string): Promise<Schema> {
  const schema: Schema = new Map()
  const viewsPath = path.join(directory, VIEWS)
  const configsPath = path.join(directory, CONFIGS)

  for await (const { name, content } of iterateDirectory(viewsPath)) {
    const view = prepareView(content)

    schema.set(`${QUERY}.${name}`, {
      view,
      name,
      mapping: [],
    })
  }

  for await (const { name, content } of iterateDirectory(configsPath)) {
    const config = yaml.parse(content) as EntityConfig

    for (const [key, relationship] of Object.entries(config.relationships)) {
      const view = schema.get(`${QUERY}.${relationship.name}`)

      if (!view) {
        throw new Error(`No view present for ${name}`)
      }

      const relationshipConfig = {
        name: relationship.name,
        alias: key,
        view: view.view,
        mapping: relationship.mapping,
      }

      schema.set(`${name}.${key}`, relationshipConfig)
    }
  }

  return schema
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

type EntityConfig = {
  relationships: Relationships
}

type Relationships = Record<string, Relationship>

export default processMetadata
