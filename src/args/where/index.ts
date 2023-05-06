import { ObjectFieldNode, ObjectValueNode } from 'graphql'
import { Output, isObject } from '..'
import { GetFromSchema, RelationshipConfig } from '../..'
import handleRelationship from '../handleRelationship'
import operators from './operators'

function* where(
  schema: GetFromSchema,
  parent: RelationshipConfig,
  value: ObjectValueNode
): Output {
  for (const field of value.fields) {
    const relationship = schema(parent, field)
    yield* relationship
      ? handleRelationship(schema, parent, field, relationship, where)
      : handleWhereField(parent, field)
  }
}

function* handleWhereField(
  parent: RelationshipConfig,
  field: ObjectFieldNode
): Output {
  if (isObject(field.value))
    for (const predicate of field.value.fields) {
      const handler = operators[predicate.name.value]
      if (!handler) throw new Error(`No handler for ${predicate.name.value}`)
      const left = getLeft(parent, field)
      yield {
        kind: 'where',
        data: handler(left, predicate)
      }
    }
}

const getLeft = (parent: RelationshipConfig, field: ObjectFieldNode) =>
  `${parent.alias}.${field.name.value}`

export default where
