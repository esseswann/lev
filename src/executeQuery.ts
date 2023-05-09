import { OperationDefinitionNode } from 'graphql'
import { Driver, TypedData } from 'ydb-sdk'
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
  const result = await getData(driver, `${prepend}\n${query}`)
  const end = performance.now()
  console.log(query)
  console.log(`Execution time`, end - start)
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

type Relationships = Map<string, TypedData[]>

export default executeQuery
