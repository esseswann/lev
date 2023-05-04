import { readFile, readdir } from 'fs/promises'
import path from 'path'
import yaml from 'yaml'
import { ColumnMapping, Schema, prepareView } from './metadata'

const VIEWS = 'views'
const CONFIGS = 'configs'
const QUERY = 'query'

const processMetadata = async (directory: string): Promise<Schema> => {
  const schema: Schema = new Map()
  const viewsPath = path.join(directory, VIEWS)
  const configsPath = path.join(directory, CONFIGS)
  for await (const { filename, content } of iterateDirectory(viewsPath)) {
    const view = await content.then(prepareView)
    schema.set(`${QUERY}.${filename}`, {
      view,
      name: filename,
      columnMapping: [],
    })
  }
  for await (const { filename, content } of iterateDirectory(configsPath)) {
    const config = (await content.then(yaml.parse)) as EntityConfig
    for (const key in config.relationships) {
      const relationship = config.relationships[key]
      const view = schema.get(`${QUERY}.${relationship.target}`)
      if (!view) throw new Error(`No view present for ${filename}`)
      const relationshipConfig = {
        name: relationship.target,
        alias: key,
        view: view.view,
        columnMapping: prepareColumnMapping(relationship.column_mapping),
      }
      schema.set(`${filename}.${key}`, relationshipConfig)
    }
  }
  return schema
}

const prepareColumnMapping = (
  columnMapping: Relationship['column_mapping']
) => {
  const result: ColumnMapping[] = []
  for (const sourceColumn in columnMapping)
    result.push({
      sourceColumn,
      targetColumn: columnMapping[sourceColumn],
    })
  return result
}

async function* iterateDirectory(directory: string) {
  for (const filename of await readdir(directory)) {
    const extension = path.extname(filename)
    yield {
      extension,
      filename: path.basename(filename, extension),
      content: readFile(path.join(directory, filename), 'utf-8'),
    }
  }
}

type EntityConfig = {
  relationships: Relationships
}

type Relationships = Record<string, Relationship>

type Relationship = {
  target: string
  cardinality: Cardinality
  column_mapping: Record<string, string>
}

type Cardinality = 'many' | 'one'

export default processMetadata
