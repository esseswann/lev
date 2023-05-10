import { OperationDefinitionNode, SelectionNode } from 'graphql'
import Long from 'long'
import { Driver, TypedData } from 'ydb-sdk'
import { getAliasedName, isField } from '.'
import getQuery from './getQuery'
import { Relationship, Schema } from './metadata'

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
  console.log(preparedQuery)
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
  const result: Record<string, TypedData[]> = {}
  const entity = getEntity(schema, {
    name: 'query',
    cardinality: 'one',
    mapping: [],
    view: ''
  })
  for (const field of operation.selectionSet.selections)
    if (isField(field))
      result[getAliasedName(field)] = handleItems(
        entity,
        data.values(),
        field.selectionSet!.selections
      )
  return result
}

const handleItems = (
  entity: Entity,
  data: IterableIterator<TypedData[]>,
  fields: readonly SelectionNode[]
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
        value = handleItems(entity, data, subFields)
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
  getRelationship: (key: string) => {
    const child = schema.get(`${config.name}.${key}`)
    if (!child) throw new Error(`No config for ${key} in ${config.name}`)
    return getEntity(schema, child)
  }
})

const isRelated = (item: TypedData) => true

export default executeQuery
