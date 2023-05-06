import { ObjectFieldNode } from 'graphql'
import { Handler, Output, isObject } from '.'
import { GetFromSchema, RelationshipConfig, getJoinExpressions } from '..'
import { Relationship } from '../metadata'

function* handleRelationship(
  schema: GetFromSchema,
  parent: RelationshipConfig,
  field: ObjectFieldNode,
  relationship: Relationship,
  handler: Handler
): Output {
  const alias = `relationship_${field.name.value}`
  const relationshipConfig = {
    ...relationship,
    alias,
    source: parent.alias,
    joinColumns: '' // FIXME this is wrong
  }
  const onExpressions = getJoinExpressions(relationshipConfig)
  yield {
    kind: 'joins',
    data: `left join $${relationship.name} as ${alias} on ${onExpressions}`
  }
  if (isObject(field.value))
    yield* handler(schema, relationshipConfig, field.value)
}

export default handleRelationship
