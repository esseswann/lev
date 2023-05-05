import { isLeft } from 'fp-ts/lib/Either'
import * as t from 'io-ts'
import { RelationshipConfig } from './processMetadata'

export type Schema = Map<Key, Relationship>

type TablePath = string
type ColumnName = string
export type Key = `${TablePath}.${ColumnName}`

export const Mapping = t.type(
  {
    source: t.string,
    target: t.string
  },
  'Mapping'
)

export const Relationship = t.intersection(
  [
    RelationshipConfig,
    t.type({
      view: t.string
    })
  ],
  'Relationship'
)

const JsonSchema = t.record(t.string, Relationship)

export const schemaToJson = (schema: Schema): string => {
  const json: Record<string, Relationship> = {}
  for (const [key, value] of schema.entries()) json[key] = value
  return JSON.stringify(json)
}

export const jsonToSchema = (json: string): Schema => {
  const obj = JSON.parse(json)
  const jsonSchema = JsonSchema.decode(obj)
  if (isLeft(jsonSchema)) throw new Error('Invalid JSON format')
  const schema: Schema = new Map()
  for (const key in jsonSchema.right)
    schema.set(key as Key, jsonSchema.right[key])
  return schema
}

export type Relationship = t.TypeOf<typeof Relationship>

export type Mapping = t.TypeOf<typeof Mapping>
