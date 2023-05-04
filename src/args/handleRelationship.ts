import { ObjectFieldNode } from 'graphql'
import { Handler, Output, isObject } from '.'
import { EntityConfig, GetFromSchema, getJoinExpressions } from '..'
import { Relationship } from '../metadata'

function* handleRelationship(
  schema: GetFromSchema,
  parent: EntityConfig,
  field: ObjectFieldNode,
  relationship: Relationship,
  handler: Handler
): Output {
  const alias = `relationship_${field.name.value}`
  const relationshipConfig = {
    alias,
    name: relationship.name,
    source: parent.alias,
    view: relationship.view,
    columnMapping: relationship.columnMapping,
    joinColumns: '', // FIXME this is wrong
  }
  const { onExpressions } = getJoinExpressions(relationshipConfig)
  yield {
    kind: 'joins',
    data: `left join $${relationship.name} as ${alias} on ${onExpressions}`,
  }
  if (isObject(field.value))
    yield* handler(schema, relationshipConfig, field.value)
}

export default handleRelationship
