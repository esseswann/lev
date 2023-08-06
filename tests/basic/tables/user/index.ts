import { Column, Session, StructFields, TableDescription, TypedValues, Types, Ydb } from "ydb-sdk";
import data from './data.json'

const table = new TableDescription()
  .withColumn(new Column('id', Types.UINT64))
  .withColumn(new Column('name', Types.UTF8))
  .withPrimaryKey('id')

export const up = (session: Session, path: string) =>
  session.createTable(path, table)

export const seed = (session: Session, path: string) =>
  session.bulkUpsert(path, convertRows(table, data))

const convertRows = (table: TableDescription, data: unknown[]): Ydb.TypedValue =>
  TypedValues.list(Types.struct(table.columns.reduce(columnsReducer, {})), data) as Ydb.TypedValue

const columnsReducer = (result: StructFields, { name, type }: Column) => ({
  ...result,
  [name]: type
})

export const down = (session: Session, path: string) =>
  session.describeTable(path)
