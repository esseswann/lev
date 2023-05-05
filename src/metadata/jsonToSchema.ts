import { isLeft } from 'fp-ts/lib/Either'
import { JsonSchema, Key, Schema } from '.'

const jsonToSchema = (json: object): Schema => {
  const jsonSchema = JsonSchema.decode(json)
  if (isLeft(jsonSchema)) throw new Error('Invalid JSON format')
  const schema: Schema = new Map()
  for (const key in jsonSchema.right)
    schema.set(key as Key, jsonSchema.right[key])
  return schema
}

export default jsonToSchema
