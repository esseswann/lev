import { OperationDefinitionNode } from 'graphql'
import { Driver, TypedData } from 'ydb-sdk'
import getQuery from './getQuery'
import { Schema } from './metadata'

const query = `
$start_date = Cast('2021-01-01' as Date);
$access = select * from \`access/ziferblat\`;
$ziferblat = select * from \`ziferblat/ziferblat\` z where z.active_from > $start_date;

$query_access =
    select t.*
      from $access t;

$query_access_ziferblats =
    select t.*
      from $ziferblat t
      join $query_access p
        on t.id = p.ziferblat_id;
        
$query_access_ziferblats_access =
    select t.*
      from $access t
      join $query_access_ziferblats p
        on t.ziferblat_id = p.id;
        
select * from $query_access;
select * from $query_access_ziferblats;
select * from $query_access_ziferblats_access;
`

const executeQuery = async (
  schema: Schema,
  driver: Driver,
  operation: OperationDefinitionNode,
  prepend: string
) => {
  const start = performance.now()
  const result = getQuery(schema, operation.selectionSet)
  const end = performance.now()
  console.log(`Execution time`, end - start)
  console.log(result)
  return 'kek'
}

// const handleEntity = async (
//   schema: Schema,
//   driver: Driver,
//   prepend: string,
//   parentConfig: Pick<RelationshipConfig, 'name'>,
//   parentData: TypedData[], // FIXME
//   selectionSet: SelectionSetNode
// ) => {
//   let relationships: Relationships = new Map()
//   const query = getQuery(schema, parentConfig, selectionSet)
//   if (query) {
//     const preparedQuery = `${prepend}\n${query}`
//     const start = performance.now()
//     relationships = await getRelationships(driver, selectionSet, preparedQuery)
//     const end = performance.now()
//     console.log(`${parentConfig.name} execution time`, end - start)
//   }
//   const result = []
//   for (const parentItem of parentData) {
//     const item: Record<string, any> = {}
//     for (const field of selectionSet.selections)
//       if (isField(field)) {
//         let value = parentItem[field.name.value]
//         if (field.selectionSet) {
//           value = relationships.get(field.name.value)
//           for (const index in value) console.log(index)
//         }
//         item[getAliasedName(field)] = value
//       }
//     result.push(item)
//   }
//   return result
// }

// // Manually map children to parent because group by with agg_list is slow in YDB
// const addChildrenToParent = (
//   config: Pick<RelationshipConfig, 'alias' | 'mapping'>,
//   parents: TypedData[],
//   children: TypedData[]
// ) => {
//   const mapping = config.mapping
//   for (const parentItem of parents) {
//     const filtered: TypedData[] = []
//     children: for (const childItem of children) {
//       for (const { source, target } of mapping)
//         if (childItem[target].toString() !== parentItem[source].toString())
//           // Without toString comparisons will be false on Long
//           continue children
//       filtered.push(childItem)
//     }
//     parentItem[config.alias] = filtered
//   }
//   return parents
// }

// const getRelationships = async (
//   driver: Driver,
//   selectionSet: SelectionSetNode,
//   query: string
// ) => {
//   const data = await getData(driver, query)
//   const relationships = selectionSet.selections
//     .filter(isField)
//     .filter(({ selectionSet }) => !!selectionSet)
//   const result: Relationships = new Map()
//   for (const index in data) {
//     const field = relationships[index]
//     result.set(field.name.value, data[index])
//   }
//   return result
// }

// const getData = async (driver: Driver, query: string) => {
//   try {
//     const results = await driver.tableClient.withSessionRetry((session) =>
//       session.executeQuery(query)
//     )
//     return results.resultSets.map((value) =>
//       TypedData.createNativeObjects(value)
//     )
//   } catch (error) {
//     console.log(query)
//     throw error
//   }
// }

type Relationships = Map<string, TypedData[]>

export default executeQuery
