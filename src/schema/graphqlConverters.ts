import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNamedOutputType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString
} from 'graphql'
import { Ydb } from 'ydb-sdk'
import { ConverterContext } from './context'

const convertPrimitiveType = (
  typeId: Ydb.Type.PrimitiveTypeId
): GraphQLScalarType => {
  switch (typeId) {
    case Ydb.Type.PrimitiveTypeId.BOOL:
      return GraphQLBoolean
    case Ydb.Type.PrimitiveTypeId.INT8:
    case Ydb.Type.PrimitiveTypeId.UINT8:
    case Ydb.Type.PrimitiveTypeId.INT16:
    case Ydb.Type.PrimitiveTypeId.UINT16:
    case Ydb.Type.PrimitiveTypeId.INT32:
    case Ydb.Type.PrimitiveTypeId.UINT32:
    case Ydb.Type.PrimitiveTypeId.INT64:
    case Ydb.Type.PrimitiveTypeId.UINT64:
      return GraphQLInt
    case Ydb.Type.PrimitiveTypeId.FLOAT:
    case Ydb.Type.PrimitiveTypeId.DOUBLE:
      return GraphQLFloat
    case Ydb.Type.PrimitiveTypeId.STRING:
    case Ydb.Type.PrimitiveTypeId.UTF8:
      return GraphQLString
    case Ydb.Type.PrimitiveTypeId.DATE:
    case Ydb.Type.PrimitiveTypeId.DATETIME:
    case Ydb.Type.PrimitiveTypeId.TIMESTAMP:
    case Ydb.Type.PrimitiveTypeId.INTERVAL:
    case Ydb.Type.PrimitiveTypeId.TZ_DATE:
    case Ydb.Type.PrimitiveTypeId.TZ_DATETIME:
    case Ydb.Type.PrimitiveTypeId.TZ_TIMESTAMP:
    case Ydb.Type.PrimitiveTypeId.YSON:
    case Ydb.Type.PrimitiveTypeId.JSON:
    case Ydb.Type.PrimitiveTypeId.UUID:
    case Ydb.Type.PrimitiveTypeId.JSON_DOCUMENT:
    case Ydb.Type.PrimitiveTypeId.DYNUMBER:
      return GraphQLString
    case Ydb.Type.PrimitiveTypeId.PRIMITIVE_TYPE_ID_UNSPECIFIED:
      throw new Error(`Unsupported primitive type: ${typeId}`)
  }
}

export const convertStruct = (
  context: ConverterContext,
  struct: Ydb.IStructType
): GraphQLNamedOutputType => {
  const fields = () => {
    const result: Record<string, GraphQLFieldConfig<unknown, unknown>> = {}

    for (const { name, type } of struct?.members || []) {
      const newPath = [...context.path, name!]
      const key = context.fieldNameCase(name!)
      result[key] = {
        type: toGraphQLType({ ...context, path: newPath }, type!)
      }
    }

    const viewName = context.path[context.path.length - 1]
    const relationships = context.relationships.get(viewName)?.entries()
    if (!relationships) return result
    for (const [fieldName, relationship] of relationships) {
      const type = context.rootFields[relationship.name].type
      result[context.fieldNameCase(fieldName)] = {
        type:
          relationship.cardinality == 'one'
            ? type!
            : new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(type!)))
      }
    }

    return result
  }

  const name = context.typeNameCase(context.path.join(' '))

  return new GraphQLObjectType({
    name,
    fields
  })
}

export const toGraphQLType = (
  context: ConverterContext,
  type: Ydb.IType
): GraphQLOutputType => {
  if (type.typeId) {
    return convertPrimitiveType(type.typeId)
  } else if (type.listType) {
    return new GraphQLList(toGraphQLType(context, type.listType!.item!))
  } else if (type.structType) {
    return convertStruct(context, type.structType)
  } else if (type.variantType) {
    // TODO: implement variant type
    return GraphQLString
  } else if (type.optionalType)
    return toGraphQLType(context, type.optionalType.item!)

  // FIXME: currently there is no way to check if the given type is non nullable
  // if (result) return new GraphQLNonNull(result)

  // These types don't have GraphQL representation:
  //  - type.voidType
  //  - type.nullType
  //  - type.emptyListType
  //  - type.emptyDictType
  //  - type.pgType
  //  - type.taggedType
  //  - type.dictType
  //  - type.tupleType, FIXME: might be list of unions

  throw new Error(`Unsupported type: ${JSON.stringify(type, null, 2)}`)
}
