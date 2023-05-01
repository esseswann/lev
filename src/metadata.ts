export type Schema = Map<Key, Relationship>

type TablePath = string
type ColumnName = string
export type Key = `${TablePath}.${ColumnName}`

export type Relationship = {
  tableName: string
  columnMapping: ColumnMapping[]
}

export type ColumnMapping = {
  sourceColumn: string
  targetColumn: string
}
