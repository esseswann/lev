import { OperationDefinitionNode, SelectionSetNode } from 'graphql'
import { Driver, TypedData } from 'ydb-sdk'
import { RelationshipConfig, getAliasedName, isField } from '.'
import getQuery from './getQuery'
import { Schema } from './metadata'

const executeQuery = async (
  schema: Schema,
  driver: Driver,
  operation: OperationDefinitionNode,
  prepend: string
) => {
  const result = await handleEntity(
    schema,
    driver,
    prepend,
    { name: 'query' },
    [{}] as TypedData[],
    operation.selectionSet
  )
  return result[0]
}

const handleEntity = async (
  schema: Schema,
  driver: Driver,
  prepend: string,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  parentData: TypedData[], // FIXME
  selectionSet: SelectionSetNode
) => {
  let relationships: Relationships = new Map()
  const query = getQuery(schema, parentConfig, selectionSet)
  if (query) {
    const preparedQuery = `${prepend}\n${query}`
    const start = performance.now()
    relationships = await getRelationships(driver, selectionSet, preparedQuery)
    const end = performance.now()
    console.log(`${parentConfig.name} execution time`, end - start)
  }
  let result: TypedData[] = []
  for (const field of selectionSet.selections)
    if (isField(field)) {
      const selectionSet = field.selectionSet
      const alias = getAliasedName(field)
      if (selectionSet) {
        const relationshipData = relationships.get(field.name.value)
        const baseConfig = schema.get(
          `${parentConfig.name}.${field.name.value}`
        )
        if (!relationshipData || !baseConfig) throw new Error('')
        const config = { ...baseConfig, alias }
        const childrenData = await handleEntity(
          schema,
          driver,
          prepend,
          config,
          relationshipData,
          selectionSet
        )
        result = addChildrenToParent(config, parentData, childrenData)
      } else console.log('scalar', field.name.value)
    }
  return result
}

// Manually map children to parent because group by with agg_list is slow in YDB
const addChildrenToParent = (
  config: Pick<RelationshipConfig, 'alias' | 'mapping'>,
  parents: TypedData[],
  children: TypedData[]
) => {
  const mapping = config.mapping
  for (const parentItem of parents) {
    const filtered: TypedData[] = []
    children: for (const childItem of children) {
      for (const { source, target } of mapping)
        if (childItem[target].toString() !== parentItem[source].toString())
          continue children
      filtered.push(childItem)
    }
    parentItem[config.alias] = filtered
  }
  return parents
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
  const result: Relationships = new Map()
  for (const index in data) {
    const field = relationships[index]
    result.set(field.name.value, data[index])
  }
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
