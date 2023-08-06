import { TypedData } from 'ydb-sdk'
import database from '../database'
import setupTable from '../setupTable'
import accessTable from './tables/access'
import userTable from './tables/user'
import userData from './tables/user/data'

const dirname = __dirname.split('/').pop()

beforeAll(async () => {
  const timeout = 10000
  await database.ready(timeout)
  await database.tableClient.withSessionRetry(async (session) =>
    Promise.all([
      setupTable(session, `${dirname}/user`, userTable, userData),
      setupTable(session, `${dirname}/access`, accessTable)
    ])
  )
})

afterAll(async () => {
  await database.tableClient.withSessionRetry(async (session) =>
    Promise.all([
      session.dropTable(`${dirname}/user`),
      session.dropTable(`${dirname}/access`)
    ])
  )
  await database.schemeClient.removeDirectory(dirname!)
})

describe('my database tests', () => {
  test('should insert data into the database', async () => {
    const query = `SELECT * FROM \`${dirname}/user\` where id = 1`
    const result = await database.tableClient.withSessionRetry(
      async (session) => {
        const result = await session.executeQuery(query)
        const resultSet = result.resultSets[0]
        return TypedData.createNativeObjects(resultSet)
      }
    )
    expect(result[0]['id']).toBe(1)
  })
})
