import { OperationDefinitionNode, SelectionNode } from 'graphql'
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
  // console.log(preparedQuery)
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
  const entity = getEntity(schema, {
    name: 'query',
    cardinality: 'one',
    mapping: [],
    view: ''
  })
  const data: Data = new Map()
  for (const index in bindings)
    data.set(getDataKey(bindings[index]), rawData[index])
  const result: Record<string, any> = {}
  for (const root of operation.selectionSet.selections)
    if (isField(root)) {
      const name = getAliasedName(root)
      const selections = root.selectionSet!.selections
      const path = ['query', name]
      result[name] = handleFields(getEntityData(data, path), selections)
    }
  return result
}

const handleFields = (
  entityData: EntityData,
  fields: readonly SelectionNode[]
) => {
  const result = []
  for (const rawItem of entityData.data) {
    const item: Record<string, any> = {}
    for (const field of fields)
      if (isField(field)) {
        const name = getAliasedName(field)
        const selections = field.selectionSet?.selections
        item[name] = selections
          ? handleFields(entityData.get(name), selections)
          : normalizeValue(rawItem[field.name.value])
      }
    result.push(item)
  }
  return result
}

const normalizeValue = (value: any) =>
  Long.isLong(value) ? value.toNumber() : value

const getEntity = (schema: Schema, config: Relationship): Entity => ({
  ...config,
  get(key: string) {
    const child = schema.get(`${config.name}.${key}`)
    if (!child) throw new Error(`No config for ${key} in ${config.name}`)
    return getEntity(schema, child)
  }
})

const getEntityData = (data: Data, path: string[]): EntityData => ({
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
type Data = Map<string, TypedData[]>
type Entity = Relationship & {
  get(key: string): Entity
}

type EntityData = {
  data: TypedData[]
  get(key: string): EntityData
}

export default executeQuery
