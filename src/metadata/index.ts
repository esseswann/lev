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
const Cardinality = t.union([t.literal('one'), t.literal('many')])
export type Cardinality = t.TypeOf<typeof Cardinality>

const RelationshipConfig = t.type({
  name: t.string,
  cardinality: Cardinality,
  mapping: t.array(Mapping)
})

const View = t.type({
  view: t.string
})

// TODO this logic is needed for mor complex cases like Struct column

// type Field = {
//   [key: string]: string | Field
// }

// const TypeUnion: t.Type<Field[string]> = t.recursion(
//   'TypeUnion',
//   () => FieldValue
// )

// const FieldValue: t.Type<Field[string]> = t.union([t.string, Field])

const Field = t.record(t.string, t.string)

const Fields = t.type({ fields: Field })

export const Relationship = t.intersection(
  [RelationshipConfig, View, Fields],
  'Relationship'
)

const Relationships = t.record(t.string, RelationshipConfig)

export const EntityConfig = t.type({
  relationships: Relationships
})

export const JsonSchema = t.record(t.string, Relationship, 'JsonSchema')

export type Relationship = t.TypeOf<typeof Relationship>

export type Mapping = t.TypeOf<typeof Mapping>
