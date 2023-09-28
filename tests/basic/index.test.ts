import { readFile } from 'fs/promises'
import { printSchema } from 'graphql'
import path from 'path'
import { TypedData } from 'ydb-sdk'
import extractMetadata from '../../src/metadata/extractMetadata'
import generateSchema from '../../src/schema'
import { getDatabase } from '../database'
import setupTable from '../setupTable'
import accessTable from './tables/access'
import userTable from './tables/user'
import userData from './tables/user/data'

const dirname = __dirname.split('/').pop()

beforeAll(async () => {
  const database = await getDatabase()

  await database.tableClient.withSession(async (session) =>
    Promise.all([
      setupTable(session, `${dirname}/user`, userTable, userData),
      setupTable(session, `${dirname}/access`, accessTable)
    ])
  )
})

afterAll(async () => {
  const database = await getDatabase()

  try {
    await database.tableClient.withSession(async (session) =>
      Promise.all([
        session.dropTable(`${dirname}/user`),
        session.dropTable(`${dirname}/access`)
      ])
    )
    await database.schemeClient.removeDirectory(dirname!)
  } finally {
    await database.destroy()
  }
})

describe('my database tests', () => {
  it('should insert data into the database', async () => {
    const database = await getDatabase()
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

  it('should generate correct schema', async () => {
    const database = await getDatabase()
    const base = path.join(__dirname, './metadata')
    const metadata = await extractMetadata(base, database)
    console.log(metadata)
    const gotSchema = await generateSchema(database, metadata)

    const wantSchema = await readFile(
      path.join(__dirname, 'schema.graphql'),
      'utf8'
    )

    expect(printSchema(gotSchema)).toBe(wantSchema)
  })
})
