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
    data.set(bindings[index].join('.'), rawData[index])
  const result: Record<string, any> = {}
  for (const root of operation.selectionSet.selections)
    if (isField(root)) {
      const name = getAliasedName(root)
      const selections = root.selectionSet!.selections
      const path = ['query', name]
      result[name] = handleFields(data, path, selections)
    }
  return result
}

const handleFields = (
  data: Data,
  path: string[],
  fields: readonly SelectionNode[]
) => {
  const rawItems = data.get(path.join('.'))!
  const result = []
  for (const rawItem of rawItems) {
    const item: Record<string, any> = {}
    console.log(path, rawItem)
    for (const field of fields)
      if (isField(field)) {
        const name = getAliasedName(field)
        const selections = field.selectionSet?.selections
        item[name] = selections
          ? handleFields(data, [...path, name], selections)
          : normalizeValue(rawItem[field.name.value])
      }
    result.push(item)
  }
  return result
}

const normalizeValue = (value: any) =>
  Long.isLong(value) ? value.toNumber() : value

type Entity = Relationship & {
  getRelationship(key: string): Entity
}

const getEntity = (schema: Schema, config: Relationship): Entity => ({
  ...config,
  getRelationship(key: string) {
    const child = schema.get(`${config.name}.${key}`)
    if (!child) throw new Error(`No config for ${key} in ${config.name}`)
    return getEntity(schema, child)
  }
})

const getIsRelated =
  (mapping: Mapping[], parent: TypedData): IsRelated =>
  (child) => {
    for (const { source, target } of mapping)
      if (normalizeValue(parent[source]) !== normalizeValue(child[target]))
        return false
    return true
  }

type IsRelated = (child: TypedData) => boolean
type Data = Map<string, TypedData[]>

export default executeQuery
