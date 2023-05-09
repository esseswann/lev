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
  return
}

type Relationships = Map<string, TypedData[]>

export default executeQuery
