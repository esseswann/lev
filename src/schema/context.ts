import { GraphQLFieldConfig } from 'graphql'
import { ObjMap } from 'graphql/jsutils/ObjMap'
import { Relationship } from '../metadata'

export type ConverterContext = {
  path: Array<string>
  relationships: Map<string, Map<string, Relationship>>
  rootFields: ObjMap<GraphQLFieldConfig<unknown, unknown>>
  typeNameCase: (input: string) => string
  fieldNameCase: (input: string) => string
}
