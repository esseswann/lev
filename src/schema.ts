import { Readable } from 'stream'
import { Driver, Session, Ydb } from 'ydb-sdk'

interface TableDescription {
  name: string
  config: Ydb.Table.DescribeTableResult
}

type Push = (chunk: TableDescription) => boolean

type Handler = (
  database: Driver,
  session: Session,
  path: string,
  push: Push
) => Promise<void>

const recursiveSchema: Handler = async (database, session, path, push) => {
  const description = await database.schemeClient.listDirectory(path)
  const promises: Promise<void>[] = []
  for (const { name, type } of description.children) {
    if (name?.startsWith('.')) continue
    const handler = handlers[type!]
    if (handler)
      promises.push(handler(database, session, `${path}/${name}`, push))
  }
  await Promise.all(promises)
}

const describeTable: Handler = async (database, session, name, push) => {
  const config = await session.describeTable(name)
  push({ name, config })
}

const handlers: Partial<Record<Ydb.Scheme.Entry.Type, Handler>> = {
  [Ydb.Scheme.Entry.Type.DIRECTORY]: recursiveSchema,
  [Ydb.Scheme.Entry.Type.TABLE]: describeTable,
}

const schemaStream = (database: Driver) => {
  const readable = new Readable({ objectMode: true, read() {} })
  database.tableClient.withSessionRetry(async (session) => {
    await recursiveSchema(database, session, '', readable.push.bind(readable))
    readable.push(null)
  })
  return readable
}
