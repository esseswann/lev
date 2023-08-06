import path from 'path'
import { Driver } from 'ydb-sdk'
import { readFile } from 'fs/promises'

export const processTable = async (database: Driver, folder: string) => {
  const tablePath = path.join(folder, 'table.sql')
  const tableQuery = await readFile(tablePath, 'utf-8')
  await database.tableClient.withSessionRetry((session) =>
    session.executeQuery(tableQuery))
  const dataPath = path.join(folder, 'data.csv')
  // TODO create schema from sql
  // TODO add data from csv
}
