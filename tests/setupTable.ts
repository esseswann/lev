import {
  Column,
  Session,
  StructFields,
  TableDescription,
  TypedValues,
  Types,
  Ydb
} from 'ydb-sdk'

const setupTable: SetupTable = async (session, path, table, data) => {
  await session.createTable(path, table)
  if (data) await session.bulkUpsert(path, convertRows(table, data))
}

const convertRows = (
  table: TableDescription,
  data: unknown[]
): Ydb.TypedValue =>
  TypedValues.list(
    Types.struct(table.columns.reduce(columnsReducer, {})),
    data
  ) as Ydb.TypedValue

const columnsReducer = (result: StructFields, { name, type }: Column) => ({
  ...result,
  [name]: type
})

type SetupTable = (
  session: Session,
  path: string,
  table: TableDescription,
  data?: Record<string, unknown>[]
) => void

export default setupTable
