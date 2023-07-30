import { Relationship } from '../metadata'

export type ConverterContext = {
  path: Array<string>
  relationships: Map<string, Array<Relationship>>
  typeNameCase: (input: string) => string
  fieldNameCase: (input: string) => string
}
