import { Column, Session, TableDescription, TypedValues, Types, Ydb } from "ydb-sdk";
import data from './data.json'

export const up = (session: Session, path: string) =>
  session.createTable(path, new TableDescription()
    .withColumn(new Column('id', Types.UINT64))
    .withColumn(new Column('name', Types.UTF8))
    .withPrimaryKey('id'))

export const seed = (session: Session, path: string) =>
  session.bulkUpsert(path, convertRows(data))

const convertRows = (data: unknown[]): Ydb.TypedValue =>
  TypedValues.list(Types.struct({
    id: Types.UINT64,
    name: Types.UTF8
  }), data) as Ydb.TypedValue

export const down = (session: Session, path: string) =>
  session.describeTable(path)
