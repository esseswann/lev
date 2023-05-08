import { OperationDefinitionNode, SelectionSetNode } from 'graphql'
import { Driver, TypedData, Ydb } from 'ydb-sdk'
import { RelationshipConfig, getAliasedName, isField } from '.'
import getQuery from './getQuery'
import { Schema } from './metadata'

const executeQuery = async (
  schema: Schema,
  driver: Driver,
  operation: OperationDefinitionNode,
  prepend: string
) =>
  handleEntity(
    schema,
    driver,
    { name: 'query' },
    Ydb.ResultSet.create({ rows: [{}] }),
    operation.selectionSet,
    prepend
  )

const handleEntity = async (
  schema: Schema,
  driver: Driver,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  parentData: Ydb.IResultSet, // FIXME
  selectionSet: SelectionSetNode,
  prepend: string
) => {
  let relationships: Relationships = {}
  const query = getQuery(schema, parentConfig, selectionSet)
  if (query) {
    const preparedQuery = `${prepend}\n${query}`
    relationships = await getRelationships(driver, selectionSet, preparedQuery)
  }
  const result = []
  const typedData = TypedData.createNativeObjects(parentData)
  for (const parentDataItem of typedData) {
    const item: Record<string, any> = {}
    for (const field of selectionSet.selections)
      if (isField(field)) {
        const key = getAliasedName(field)
        if (!field.selectionSet) {
          item[key] = (parentDataItem as any)[field.name.value]
        } else {
          const config = schema.get(`${parentConfig.name}.${field.name.value}`)
          if (!config) throw new Error('No config')
          const data = relationships[field.name.value]
          const relationship = await handleEntity(
            schema,
            driver,
            config,
            data,
            field.selectionSet,
            prepend
          )
          item[key] = relationship
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
  const relationships = selectionSet.selections
    .filter(isField)
    .filter(({ selectionSet }) => !!selectionSet)
  const result: Relationships = {}
  for (const index in data) {
    const field = relationships[index]
    result[field.alias?.value || field.name.value] = data[index]
  }
  return result
}

const getData = async (driver: Driver, query: string) => {
  try {
    const results = await driver.tableClient.withSessionRetry((session) =>
      session.executeQuery(query)
    )
    return results.resultSets
  } catch (error) {
    console.log(query)
    throw error
  }
}

type Relationships = Record<string, Ydb.IResultSet>

export default executeQuery
