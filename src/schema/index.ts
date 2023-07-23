import {
  GraphQLFieldConfig,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  ThunkObjMap
} from 'graphql'
import extractTypes from 'ydb-codegen/lib/extractIo/extractTypes'
import { Driver } from 'ydb-sdk'
import caseConverters from '../caseConverters'
import { Schema } from '../metadata'
import { ConverterContext } from './context'
import { convertStruct } from './graphql'

const generateSchema = async (
  driver: Driver,
  metadata: Schema
): Promise<GraphQLSchema> => {
  const rootFields: ThunkObjMap<GraphQLFieldConfig<unknown, unknown>> = {}

  for (const value of metadata.values()) {
    // const query = `${value.view}\nselect * from \$${value.name};\nselect * from \$${value.name};`
    const query = `${value.view}\nselect * from \$${value.name};`

    const { queryAst } = await driver.tableClient.withSession((session) =>
      session.explainQuery(query)
    )
    const { outputs } = extractTypes(queryAst)

    const context: ConverterContext = {
      path: [value.name],
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
