import extractTypes from 'ydb-codegen/lib/extractIo/extractTypes'
import { Driver, Ydb } from 'ydb-sdk'
import { Relationship } from '../metadata'

const getStructFromQuery = async (
  driver: Driver,
  value: Pick<Relationship, 'name' | 'view'>
): Promise<Ydb.IStructType> => {
  const query = `${value.view}\nselect * from \$${value.name};`
  const { queryAst } = await driver.tableClient.withSession((session) =>
    session.explainQuery(query)
  )
  const outputs = extractTypes(queryAst).outputs
  return outputs[outputs.length - 1].listType?.item?.structType!
}

export default getStructFromQuery
