import { Kind, ObjectFieldNode, ObjectValueNode } from 'graphql'
import { Output } from '.'
import { EntityConfig, GetFromSchema } from '..'
import handleRelationship from './handleRelationship'

// FIXME does not properly work because of agg_list
function* orderBy(
  schema: GetFromSchema,
  parent: EntityConfig,
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
  parent: EntityConfig,
  field: ObjectFieldNode
): Output {
  const name = parent.name
  if (field.value.kind !== Kind.ENUM)
    throw new Error(`Order by argument be enum not ${field.value.kind}`)
  const value = variants[field.value.value]
  if (!value) throw new Error(`Unknown order by variant ${field.value.value}`)
  yield {
    kind: 'orderBy',
    data: `${name}.${field.name.value} ${value}`,
  }
}

const variants: Record<string, string> = {
  ASC: 'asc',
  DESC: 'desc',
}

export default orderBy
