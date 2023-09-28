import {
  GraphQLFieldConfig,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema
} from 'graphql'
import { ObjMap } from 'graphql/jsutils/ObjMap'
import { Driver, Ydb } from 'ydb-sdk'
import caseConverters from '../caseConverters'
import { Relationship, Schema } from '../metadata'
import { ConverterContext } from './context'
import getStructFromQuery from './getStructFromQuery'
import { convertStruct } from './graphqlConverters'

const generateSchema = async (
  driver: Driver,
  metadata: Schema
): Promise<GraphQLSchema> => {
  const rootFields: ObjMap<GraphQLFieldConfig<unknown, unknown>> = {}

  const relationships: Map<string, Map<string, Relationship>> = new Map()
  for (const [key, value] of metadata.entries()) {
    const [viewName, entry] = key.split('.')
    if (!relationships.has(viewName)) {
      relationships.set(viewName, new Map())
    }
    relationships.get(viewName)!.set(entry, value)
  }

  for (const value of metadata.values()) {
    if (value.mapping.length !== 0) continue // handle views only

    const context: ConverterContext = {
      path: [value.name],
      relationships: relationships,
      rootFields: rootFields,
      // FIXME: should come from config
      typeNameCase: caseConverters.pascalCase,
      fieldNameCase: caseConverters.camelCase
    }
    const struct = await getStructFromQuery(driver, value)
    const graphqlType = convertStruct(context, struct)
    rootFields[value.name] = {
      type: graphqlType
    }
  }

  const context: ConverterContext = {
    path: ['query'],
    relationships: relationships,
    rootFields: rootFields,
    // FIXME: should come from config
    typeNameCase: caseConverters.pascalCase,
    fieldNameCase: caseConverters.camelCase
  }

  const query = convertStruct(context, new Ydb.StructType({ members: [] }))

  const schema = new GraphQLSchema({
    types: Object.values(rootFields).map(
      ({ type }) => type
    ) as GraphQLNamedType[],
    query: query as GraphQLObjectType
  })

  return schema
}

export default generateSchema
