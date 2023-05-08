import { OperationDefinitionNode } from 'graphql'
import { Driver, TypedData } from 'ydb-sdk'
import { isField } from '.'
import getView from './handleRelationships'
import { Schema } from './metadata'

const executeQuery = async (
  schema: Schema,
  driver: Driver,
  operation: OperationDefinitionNode,
  prepend: string
) => {
  const selectionSet = operation.selectionSet
  const query = getView(schema, { name: 'query' }, selectionSet)
  const preparedQuery = `${prepend}\n${query}`
  console.log(preparedQuery)
  const data = await getData(driver, preparedQuery)
  const result: Record<string, TypedData[]> = {}
  for (const index in data) {
    const field = selectionSet.selections[index]
    if (isField(field))
      result[field.alias?.value || field.name.value] = data[index]
  }
  return result
}

const getData = async (driver: Driver, query: string) => {
  const results = await driver.tableClient.withSessionRetry((session) =>
    session.executeQuery(query)
  )
  return results.resultSets.map((resultSet) =>
    TypedData.createNativeObjects(resultSet)
  )
}

export default executeQuery
