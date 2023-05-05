import * as t from 'io-ts'

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

const RelationshipConfig = t.type({
  name: t.string,
  mapping: t.array(Mapping)
})

export const Relationship = t.intersection(
  [
    RelationshipConfig,
    t.type({
      view: t.string
    })
  ],
  'Relationship'
)

const Relationships = t.record(t.string, RelationshipConfig)

export const EntityConfig = t.type({
  relationships: Relationships
})

export const JsonSchema = t.record(t.string, Relationship, 'JsonSchema')

export type Relationship = t.TypeOf<typeof Relationship>

export type Mapping = t.TypeOf<typeof Mapping>
