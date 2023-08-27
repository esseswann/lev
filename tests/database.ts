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

export default driver
