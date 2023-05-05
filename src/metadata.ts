import * as t from 'io-ts'
import { RelationshipConfig } from './processMetadata'

export type Schema = Map<Key, Relationship>

type TablePath = string
type ColumnName = string
export type Key = `${TablePath}.${ColumnName}`

export const Mapping = t.type(
  {
    source: t.string,
    target: t.string,
  },
  'Mapping'
)

export const Relationship = t.intersection(
  [
    RelationshipConfig,
    t.type({
      view: t.string,
    }),
  ],
  'Relationship'
)

export type Relationship = t.TypeOf<typeof Relationship>

export type Mapping = t.TypeOf<typeof Mapping>

// type Cardinality = 'many' | 'one'
