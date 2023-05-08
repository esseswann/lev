import { OperationDefinitionNode, SelectionSetNode } from 'graphql'
import type { Driver } from 'ydb-sdk'
import { TypedData } from 'ydb-sdk'
import { RelationshipConfig, getAliasedName, isField } from '.'
import getQuery from './getQuery'
import { Schema } from './metadata'

const executeQuery = async (
  schema: Schema,
  driver: Driver,
  operation: OperationDefinitionNode,
  prepend: string
) => {
  const selectionSet = operation.selectionSet
  const query = getQuery(schema, { name: 'query' }, selectionSet)
  const result = handleEntity(
    schema,
    driver,
    { name: 'query' },
    [{}],
    selectionSet,
    prepend
  )
  return result
}

const handleEntity = async (
  schema: Schema,
  driver: Driver,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  parentData: any[],
  selectionSet: SelectionSetNode,
  prepend: string
) => {
  const query = getQuery(schema, parentConfig, selectionSet)
  const preparedQuery = `${prepend}\n${query}`
  const relationships = await getRelationships(
    driver,
    selectionSet,
    preparedQuery
  )
  const result = []
  for (const parentDataItem of parentData) {
    const item: Record<string, any> = {}
    for (const field of selectionSet.selections)
      if (isField(field)) {
        const key = getAliasedName(field)
        if (!field.selectionSet)
          item[key] = parentDataItem.getValue(field.name.value)
        else {
          const config = schema.get(`${parentConfig.name}.${field.name.value}`)
          if (!config) throw new Error('kek')
          item[key] = relationships[field.name.value]
        }
      }
    result.push(item)
  }
  return result
}

const getRelationships = async (
  driver: Driver,
  selectionSet: SelectionSetNode,
  query: string
) => {
  const data = await getData(driver, query)
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
