export const prepareView = (str: string) => {
  let trimmed = str.replace(/\s{1,}/g, ' ').trim()
  if (trimmed[trimmed.length - 1] !== ';') trimmed += ';'
  return trimmed
}

export type Schema = Map<Key, Relationship>

type TablePath = string
type ColumnName = string
export type Key = `${TablePath}.${ColumnName}`

export type Relationship = {
  tableName: string
  columnMapping: ColumnMapping[]
  view?: string
}

export type ColumnMapping = {
  sourceColumn: string
  targetColumn: string
}
