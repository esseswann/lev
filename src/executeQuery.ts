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
  const query = getQuery(schema, operation.selectionSet)
  const preparedQuery = `${prepend}\n${query}`
  const rawData = await getData(driver, preparedQuery)
  const end = performance.now()
  const result = combineData(schema, operation, rawData)
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
  data: TypedData[][]
) => {
  const entity = getEntity(schema, {
    name: 'query',
    cardinality: 'one',
    mapping: [],
    view: ''
  })
  const values = [[{} as TypedData], ...data].values()
  const result = handleFields(values, operation.selectionSet.selections)
  return result
}

const handleFields = (
  data: IterableIterator<TypedData[]>,
  fields: readonly SelectionNode[]
) => {
  const next = data.next()
  if (next.done) throw new Error('should not be done by now')
  const items = next.value
  const result: TypedData[] = Array(items.length)
  for (const field of fields)
    if (isField(field)) {
      const value =
        field.selectionSet && handleFields(data, field.selectionSet.selections)
      for (let index = 0; index < items.length; index++) {
        if (!result[index]) result[index] = {} as TypedData
        result[index][getAliasedName(field)] =
          value || normalizeValue(items[index][field.name.value])
      }
    }
  return result
}

const handleItems = (
  entity: Entity,
  data: IterableIterator<TypedData[]>,
  fields: readonly SelectionNode[],
  isRelated: IsRelated
) => {
  const next = data.next()
  if (next.done) throw new Error('Should not be done by now')
  const result = []
  for (const item of next.value)
    if (isRelated(item)) result.push(handleItem(entity, data, fields, item))
  return result
}

const handleItem = (
  entity: Entity,
  data: IterableIterator<TypedData[]>,
  fields: readonly SelectionNode[],
  item: TypedData
) => {
  const result = {} as TypedData
  for (const field of fields)
    if (isField(field)) {
      let value = item[field.name.value]
      const subFields = field.selectionSet?.selections
      if (subFields) {
        const childEntity = entity.getRelationship(field.name.value)
        const isRelated = getIsRelated(childEntity.mapping, item)
        value = handleItems(childEntity, data, subFields, isRelated)
      } else if (value) value = normalizeValue(value)
      result[getAliasedName(field)] = value
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

export default executeQuery
