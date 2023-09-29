import { isLeft } from 'fp-ts/lib/These'
import fs from 'fs/promises'
import { PathReporter } from 'io-ts/lib/PathReporter'
import path from 'path'
import yaml from 'yaml'
import { Driver, Ydb } from 'ydb-sdk'
import { EntityConfig, Relationship, Schema } from '.'
import extractStructFromQuery from '../schema/getStructFromQuery'
import { compileViews } from './compileViews'
import { CONFIGS, QUERY, TEMPLATES, VIEWS } from './constants'

async function processMetadata(
  directory: string,
  driver: Driver
): Promise<Schema> {
  const schema: Schema = new Map()

  await processViews(directory, schema, driver)
  await processConfigs(directory, schema)

  return schema
}

async function processViews(directory: string, schema: Schema, driver: Driver) {
  const viewsPath = path.join(directory, VIEWS)
  const templatesPath = path.join(directory, TEMPLATES)

  for await (const { name, result: view } of compileViews(
    viewsPath,
    templatesPath
  )) {
    const extension = path.extname(name)
    const baseName = path.basename(name, extension)
    const fields = await getFields(driver, { name: baseName, view })

    schema.set(`${QUERY}.${baseName}`, {
      view,
      name: baseName,
      cardinality: 'many',
      mapping: [],
      fields
    })
  }
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
      const name = relationship.name

      const schemaName = `${QUERY}.${name}` as `${string}.${string}`
      const target = schema.get(schemaName)

      if (!target) throw new Error(`No view present for ${name}`)

      const relationshipConfig = {
        fields: {},
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

async function getFields(
  driver: Driver,
  view: Pick<Relationship, 'name' | 'view'>
) {
  const fields: Record<string, string> = {}
  for await (const field of getViewTypings(driver, view))
    fields[field.name] = field.type
  return fields
}

async function* getViewTypings(
  driver: Driver,
  view: Pick<Relationship, 'name' | 'view'>
) {
  const struct = await extractStructFromQuery(driver, view)
  if (struct.members)
    for (const field of struct.members) {
      // FIXME should handle non-primitive types
      if (field.name && field.type?.typeId) {
        const name = field.name
        const type = Ydb.Type.PrimitiveTypeId[field.type.typeId]
        yield { name, type }
      }
    }
}

export default processMetadata
