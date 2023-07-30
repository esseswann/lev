import {
  GraphQLFieldConfig,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema
} from 'graphql'
import { ObjMap } from 'graphql/jsutils/ObjMap'
import extractTypes from 'ydb-codegen/lib/extractIo/extractTypes'
import { Driver } from 'ydb-sdk'
import caseConverters from '../caseConverters'
import { Relationship, Schema } from '../metadata'
import { ConverterContext } from './context'
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

  for (const [key, value] of metadata.entries()) {
    if (value.mapping.length !== 0) continue // handle views only

    const query = `${value.view}\nselect * from \$${value.name};`

    const { queryAst } = await driver.tableClient.withSession((session) =>
      session.explainQuery(query)
    )
    const { outputs } = extractTypes(queryAst)

    const context: ConverterContext = {
      path: [value.name],
      relationships: relationships,
      rootFields: rootFields,
      // FIXME: should come from config
      typeNameCase: caseConverters.pascalCase,
      fieldNameCase: caseConverters.camelCase
    }

    const struct = outputs[outputs.length - 1].listType?.item?.structType!
    const graphqlType = convertStruct(context, struct)
    rootFields[value.name] = {
      type: graphqlType
    }
  }

  const schema = new GraphQLSchema({
    types: Object.values(rootFields).map(
      ({ type }) => type
    ) as GraphQLNamedType[],
    query: new GraphQLObjectType({ name: 'query', fields: rootFields })
  })

  return schema
}

export default generateSchema
