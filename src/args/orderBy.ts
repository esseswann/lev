import { Kind, ObjectFieldNode, ObjectValueNode } from 'graphql'
import { Output } from '.'
import { GetFromSchema, RelationshipConfig } from '..'
import handleRelationship from './handleRelationship'

// FIXME does not properly work because of agg_list
function* orderBy(
  schema: GetFromSchema,
  parent: RelationshipConfig,
  value: ObjectValueNode
): Output {
  for (const field of value.fields) {
    const relationship = schema(parent, field)
    yield* relationship
      ? handleRelationship(schema, parent, field, relationship, orderBy)
      : handleOrderByField(parent, field)
  }
}

function* handleOrderByField(
  parent: RelationshipConfig,
  field: ObjectFieldNode
): Output {
  const name = parent.alias
  if (field.value.kind !== Kind.ENUM)
    throw new Error(`Order by argument be enum not ${field.value.kind}`)
  const value = variants[field.value.value]
  if (!value) throw new Error(`Unknown order by variant ${field.value.value}`)
  yield {
    kind: 'orderBy',
    data: `${name}.${field.name.value} ${value}`
  }
}

const variants: Record<string, string> = {
  ASC: 'asc',
  DESC: 'desc'
}

export default orderBy
