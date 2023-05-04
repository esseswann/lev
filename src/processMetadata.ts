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
      tableName: filename,
      columnMapping: [],
    })
  }
  for await (const { filename, content } of iterateDirectory(configsPath)) {
    const view = schema.get(`${QUERY}.${filename}`)
    if (!view) throw new Error(`No view present for ${filename}`)
    const config = (await content.then(yaml.parse)) as EntityConfig
    for (const name in config.relationships) {
      const relationshipConfig = {
        tableName: view.tableName,
        view: view.view,
        columnMapping: prepareColumnMapping(
          config.relationships[name].column_mapping
        ),
      }
      schema.set(`${filename}.${name}`, relationshipConfig)
    }
  }
  return schema
}

const prepareColumnMapping = (columnMapping: MetadataColumnMapping) => {
  const result: ColumnMapping[] = []
  for (const key in columnMapping) {
    result.push({
      sourceColumn: key,
      targetColumn: columnMapping[key],
    })
  }
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
  cardinality: Cardinality
  column_mapping: MetadataColumnMapping
}

type Cardinality = 'many' | 'one'
type MetadataColumnMapping = Record<string, string>

export default processMetadata
