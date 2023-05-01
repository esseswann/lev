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
    yield* handler(schema, relationshipConfig, field.value)
}

export default handleRelationship
