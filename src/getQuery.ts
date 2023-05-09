import { FieldNode, SelectionSetNode } from 'graphql'
import {
  GetFromSchema,
  RelationshipConfig,
  getRelationshipHandler,
  isField
} from '.'
import getArguments from './args'
import { Schema } from './metadata'

const getQuery = (
  schema: Schema,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  selectionSet: SelectionSetNode
) => {
  const fields = selectionSet.selections.filter(isField)
  const views = new Set<string>()
  const getFromSchema = getRelationshipHandler(schema, views)
  const selects = handleRelationships(getFromSchema, parentConfig, fields)
  return [...views].concat(selects).join('\n')
}

const handleRelationships = (
  getFromSchema: GetFromSchema,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  fields: FieldNode[]
) => {
  const views = []
  for (const selection of fields)
    if (selection.selectionSet)
      views.push(getRelationship(getFromSchema, parentConfig, selection))
  return views
}

const getRelationship = (
  getFromSchema: GetFromSchema,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  selection: FieldNode
) => {
  const relationship = getFromSchema(parentConfig, selection)
  if (!relationship)
    throw new Error(`No ${selection.name.value} in ${parentConfig.name}`)
  const select = getSelect(relationship)
  const { joins, where, orderBy } = getArguments(
    getFromSchema,
    relationship,
    selection.arguments!
  )
  const result = [select]
  if (joins.size) result.push([...joins].join(' and '))
  if (where.size) result.push(`where ${[...where].join(' and ')}`)
  if (orderBy.size) result.push([...orderBy].join(','))
  return result.join(' ').concat(';')
}

const getSelect = (config: RelationshipConfig) =>
  `select ${config.alias}.* from $${config.name} as ${config.alias}`

export default getQuery
