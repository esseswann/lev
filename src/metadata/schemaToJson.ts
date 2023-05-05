import * as t from 'io-ts'
import { JsonSchema, Schema } from '.'

const schemaToJson = (schema: Schema) => {
  const json: t.TypeOf<typeof JsonSchema> = {}
  for (const [key, value] of schema.entries()) json[key] = value
  return json
}

export default schemaToJson
