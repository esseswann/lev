import path from 'path'
import {
  Driver,
  IamAuthService,
  MetadataAuthService,
  getSACredentialsFromJson
} from 'ydb-sdk'

const authService =
  process.env['NODE_ENV'] === 'development'
    ? new IamAuthService(
        getSACredentialsFromJson(path.join(__dirname, 'authorized_key.json'))
      )
    : new MetadataAuthService()

const endpoint = 'grpcs://ydb.serverless.yandexcloud.net:2135'
const database = process.env['DATABASE_NAME']
const driver = new Driver({ endpoint, database, authService })

export const getDatabase = async () => {
  const timeout = 2000 // Should be less then Jest timeout

  const isReady = await driver.ready(timeout)
  if (!isReady)
    throw new Error(`Database has not become ready in ${timeout}ms!`)

  return driver
}

export default driver
