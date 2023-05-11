import { FieldNode, OperationDefinitionNode, SelectionNode } from 'graphql'
import Long from 'long'
import { Driver, TypedData } from 'ydb-sdk'
import { getAliasedName, isField } from '.'
import getQuery from './getQuery'
import { Mapping, Relationship, Schema } from './metadata'

const executeQuery = async (
  schema: Schema,
  driver: Driver,
  operation: OperationDefinitionNode,
  prepend: string
) => {
  const start = performance.now()
  const { bindings, query } = getQuery(schema, operation.selectionSet)
  const preparedQuery = `${prepend}\n${query}`
  const rawData = await getData(driver, preparedQuery)
  const end = performance.now()
  const result = combineData(schema, operation, rawData, bindings)
  console.log(`Execution time: ${end - start}`)
  console.log(result)
  return result
}

const getData = async (driver: Driver, query: string) => {
  try {
    const results = await driver.tableClient.withSessionRetry((session) =>
      session.executeQuery(query)
    )
    return results.resultSets.map((value) =>
      TypedData.createNativeObjects(value)
    )
  } catch (error) {
    console.log(query)
    throw error
  }
}

const combineData = (
  schema: Schema,
  operation: OperationDefinitionNode,
  rawData: TypedData[][],
  bindings: string[][]
) => {
  const data: DataMap = new Map()
  for (const index in bindings)
    data.set(getDataKey(bindings[index]), rawData[index])
  const entity = {
    config: getEntity(schema, { name: 'query', mapping: [] }),
    data: getEntityData(data, ['query'])
  }
  const result = handleFields(
    entity,
    operation.selectionSet.selections,
    {} as TypedData
  )
  return result
}

const handleData = (
  entity: Entity,
  fields: readonly SelectionNode[],
  isRelated: IsRelated
) => {
  const result = []
  for (const item of entity.data.data)
    if (isRelated(item)) result.push(handleFields(entity, fields, item))
  return result
}
const handleFields = (
  entity: Entity,
  fields: readonly SelectionNode[],
  rawItem: TypedData
) => {
  const item: Record<string, any> = {}
  for (const field of fields)
    if (isField(field))
      item[getAliasedName(field)] = handleValue(entity, field, rawItem)
  return item
}

const handleValue = (
  { config, data }: Entity,
  field: FieldNode,
  item: TypedData
) => {
  const name = getAliasedName(field)
  let value = normalizeValue(item[field.name.value])
  const selections = field.selectionSet?.selections
  if (selections) {
    const child = {
      config: config.get(field.name.value),
      data: data.get(name)
    }
    const isRelated = getIsRelated(child.config.mapping, item)
    value = handleData(child, selections, isRelated)
  }
  return value
}

const normalizeValue = (value: any) =>
  Long.isLong(value) ? value.toNumber() : value

const getEntity = (schema: Schema, config: Omit<Config, 'get'>): Config => ({
  ...config,
  get(key: string) {
    const child = schema.get(`${config.name}.${key}`)
    if (!child) throw new Error(`No config for ${key} in ${config.name}`)
    return getEntity(schema, child)
  }
})

const getEntityData = (data: DataMap, path: string[]): Data => ({
  data: data.get(getDataKey(path))!,
  get: (key: string) => getEntityData(data, path.concat(key))
})

const getIsRelated =
  (mapping: Mapping[], parent: TypedData): IsRelated =>
  (child) => {
    for (const { source, target } of mapping)
      if (normalizeValue(parent[source]) !== normalizeValue(child[target]))
        return false
    return true
  }
const getDataKey = (path: string[]) => path.join('.')
type IsRelated = (child: TypedData) => boolean
type DataMap = Map<string, TypedData[]>
type Entity = {
  config: Config
  data: Data
}
type Config = Pick<Relationship, 'name' | 'mapping'> & {
  get(key: string): Config
}

type Data = {
  data: TypedData[]
  get(key: string): Data
}

export default executeQuery
