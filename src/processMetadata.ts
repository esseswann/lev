import { promises as fs } from 'fs'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/lib/PathReporter'
import path from 'path'
import yaml from 'yaml'

import { isLeft } from 'fp-ts/lib/These'
import { Mapping, Schema } from './metadata'

const VIEWS = 'views'
const CONFIGS = 'configs'
const QUERY = 'query'

async function processMetadata(directory: string): Promise<Schema> {
  const schema: Schema = new Map()
  const viewsPath = path.join(directory, VIEWS)
  const configsPath = path.join(directory, CONFIGS)

  for await (const { name, content } of iterateDirectory(viewsPath)) {
    checkView(name, content) // FIXME
    const view = prepareView(content)

    schema.set(`${QUERY}.${name}`, {
      view,
      name,
      mapping: []
    })
  }

  for await (const { name, content } of iterateDirectory(configsPath)) {
    const config = fromYaml(content)

    for (const [key, relationship] of Object.entries(config.relationships)) {
      const target = schema.get(`${QUERY}.${relationship.name}`)

      if (!target) throw new Error(`No view present for ${name}`)

      const relationshipConfig = {
        ...relationship,
        view: target.view
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

const fromYaml = (input: string) => {
  const json = yaml.parse(input)
  const result = EntityConfig.decode(json)
  if (isLeft(result)) throw new Error(PathReporter.report(result).join('\n'))
  return result.right
}

const checkView = (name: string, str: string) => {
  if (!str.includes(`$${name}`))
    throw new Error(
      `View ${name} should contain select expression assigned to $${name} so that target result set is distinguished from other expressions`
    )
}

const prepareView = (str: string) => {
  let trimmed = str.replace(/\s{1,}/g, ' ').trim()
  if (trimmed[trimmed.length - 1] !== ';') trimmed += ';'
  return trimmed
}

export const RelationshipConfig = t.type({
  name: t.string,
  mapping: t.array(Mapping)
})

const Relationships = t.record(t.string, RelationshipConfig)

const EntityConfig = t.type({
  relationships: Relationships
})

export default processMetadata
