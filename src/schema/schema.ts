import { Ydb } from 'ydb-sdk'
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLScalarType,
  GraphQLString
} from 'graphql'

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
