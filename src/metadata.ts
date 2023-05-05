import * as t from 'io-ts'
import jsConvert from 'js-convert-case'

export const convertCase = (str: string) => {
  const result = jsConvert.toCamelCase(str)
  return result
}

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
export const Relationship = t.type(
  {
    name: t.string,
    view: t.string,
    mapping: t.array(Mapping),
  },
  'Relationship'
)

export type Relationship = t.TypeOf<typeof Relationship>

export type Mapping = t.TypeOf<typeof Mapping>

// type Cardinality = 'many' | 'one'
