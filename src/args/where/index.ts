import { ObjectFieldNode, ObjectValueNode } from 'graphql'
import { Output, isObject } from '..'
import { EntityConfig, GetFromSchema, getJoinExpressions } from '../..'
import { Relationship } from '../../metadata'
import operators from './operators'

function* where(
  schema: GetFromSchema,
  parent: EntityConfig,
  value: ObjectValueNode
): Output {
  for (const field of value.fields) {
    const relationship = schema(parent, field)
    yield* relationship
      ? handleRelationship(schema, parent, field, relationship)
      : handleWhereField(parent, field)
  }
}

function* handleRelationship(
  schema: GetFromSchema,
  parent: EntityConfig,
  field: ObjectFieldNode,
  relationship: Relationship
): Output {
  const name = `relationship_${field.name.value}`
  const relationshipConfig = {
    ...relationship,
    name,
    source: parent.name,
    joinColumns: '',
  }
  const { onExpressions } = getJoinExpressions(relationshipConfig)
  yield {
    kind: 'joins',
    data: `left join \`${relationship.tableName}\` ${name} on ${onExpressions}`,
  }
  if (isObject(field.value))
    yield* where(schema, relationshipConfig, field.value)
}

function* handleWhereField(
  parent: EntityConfig,
  field: ObjectFieldNode
): Output {
  if (isObject(field.value))
    for (const predicate of field.value.fields) {
      const handler = operators[predicate.name.value]
      if (!handler) throw new Error(`No handler for ${predicate.name.value}`)
      const left = getLeft(parent, field)
      yield {
        kind: 'where',
        data: handler(left, predicate),
      }
    }
}

const getLeft = (parent: EntityConfig, field: ObjectFieldNode) =>
  `${parent.name}.${field.name.value}`

export default where
