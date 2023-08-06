import database from '../database'

// TODO an example of structure

beforeAll(async () => {
  await database.ready()
})

afterAll(async () => {
  await database.close()
})

describe('my database tests', () => {
  test('should insert data into the database', async () => {
    const collection = database.collection('myCollection')
    const data = { name: 'John Doe' }
    const result = await collection.insertOne(data)
    expect(result.insertedCount).toBe(1)
  })
})