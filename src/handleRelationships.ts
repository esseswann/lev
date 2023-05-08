import { FieldNode, OperationDefinitionNode } from 'graphql'
import {
  GetFromSchema,
  RelationshipConfig,
  getRelationshipHandler,
  isField
} from '.'
import getArguments from './args'
import { Schema } from './metadata'

const getView = (schema: Schema, operation: OperationDefinitionNode) => {
  const fields = operation.selectionSet.selections.filter(isField)
  const views = new Set<string>()
  const getFromSchema = getRelationshipHandler(schema, views)
  return handleRelationships(getFromSchema, { name: 'query' }, fields)
}

const handleRelationships = (
  getFromSchema: GetFromSchema,
  parentConfig: Pick<RelationshipConfig, 'name'>,
  fields: FieldNode[]
) => {
  const views = []
  for (const selection of fields)
    if (selection.selectionSet) {
      const selections = selection.selectionSet.selections.filter(isField)
      const relationship = getFromSchema(parentConfig, selection)
      if (!relationship)
        throw new Error(`No ${selection.name.value} in ${parent}`)
      const select = getSelect(relationship, selections)
      const { joins, where, orderBy } = getArguments(
        getFromSchema,
        relationship,
        selection.arguments!
      )
      const result = [select]
        .concat([...joins].join(' and '))
        .concat(where.size ? `where ${[...where].join(' and ')}` : [])
        .concat([...orderBy].join(','))
      views.push(result.join(' '))
    }
  return views
}

const getSelect = (
  config: RelationshipConfig,
  selections: readonly FieldNode[]
) => {
  const struct = [`${config.alias}.*`]
  // [
  //   `agg_list(<|${selections.reduce(getStructField, [])}|>) as data`
  // ]
  const targets = config.mapping.map(({ target }) => target)
  const selectionSet = struct.concat(targets).join(', ')
  const tail = [`$${config.name} as ${config.alias}`]
  if (targets.length) tail.push(`group by ${targets.join(',')}`)
  return `select ${selectionSet} from ${tail.join(' ')}`
}

const getStructField = (result: string[], field: FieldNode) =>
  field.selectionSet
    ? result
    : result.concat(`${field.name.value}:${field.name.value}`)

export default getView
