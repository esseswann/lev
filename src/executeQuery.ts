import { OperationDefinitionNode, SelectionNode } from 'graphql'
import Long from 'long'
import { Driver, TypedData } from 'ydb-sdk'
import { getAliasedName, isField } from '.'
import getQuery from './getQuery'
import { Schema } from './metadata'

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
  for (const field of operation.selectionSet.selections)
    if (isField(field))
      result[getAliasedName(field)] = handleItems(
        field.selectionSet!.selections,
        data.values()
      )
  return result
}

const handleItems = (
  fields: readonly SelectionNode[],
  data: IterableIterator<TypedData[]>
) => {
  const next = data.next()
  if (next.done) throw new Error('Should not be done by now')
  return next.value.map((item) => handleItem(fields, data, item))
}

const handleItem = (
  fields: readonly SelectionNode[],
  data: IterableIterator<TypedData[]>,
  item: TypedData
) => {
  const result = {} as TypedData
  for (const field of fields)
    if (isField(field)) {
      let value = item[field.name.value]
      const subFields = field.selectionSet?.selections
      if (subFields) value = handleItems(subFields, data)
      else if (value) value = normalizeValue(value)
      result[getAliasedName(field)] = value
    }
  return result
}

const normalizeValue = (value: any) =>
  Long.isLong(value) ? value.toNumber() : value

export default executeQuery
