import {
  FieldNode,
  Kind,
  ObjectFieldNode,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from 'graphql'
import getArguments from './args'
import { Relationship, Schema } from './metadata'
import getVariable from './variables'

const ROWS = 'rows'

const convert = (schema: Schema, operation: OperationDefinitionNode) => {
  const expressions = new Set<string>()
  const getFromSchema = getRelationshipHandler(schema, expressions)
  if (operation.variableDefinitions)
    for (const variable of operation.variableDefinitions)
      expressions.add(getVariable(variable))
  for (const selection of operation.selectionSet.selections)
    if (isField(selection)) {
      const relationship = getFromSchema({ tableName: 'query' }, selection)
      if (!relationship)
        throw new Error(
          `Unknown root field ${selection.name.value}. Did you forget to add a view for it?`
        )
      const config = {
        ...relationship,
        name: selection.name.value,
        joinColumns: '',
      }
      const expression = getSelect(getFromSchema, config, selection)
      expressions.add(expression)
    }
  return [...expressions.values()].join('\n')
}

const getSelect = (
  schema: GetFromSchema,
  config: EntityConfig,
  selection: FieldNode
) => {
  let { selections, joins } = getSelections(
    schema,
    config,
    selection.selectionSet!
  )
  let groupBy = ''
  if (config.joinColumns) {
    selections += `, ${config.joinColumns}`
    groupBy = `group by ${config.joinColumns}`
  }
  const tail = [config.name]
  const args = getArguments(schema, config, selection.arguments!)
  tail.push(joins.concat([...args.joins]).join(' '))
  if (args.where.size) tail.push(`where ${[...args.where].join(' and ')}`)
  if (args.orderBy.size) tail.push(`order by ${[...args.orderBy].join(',')}`)
  if (groupBy) tail.push(groupBy)
  const preparedTail = tail.join(' ')
  return `select ${selections} from ${config.tableName} as ${preparedTail}`
}

const getRelationship = (
  schema: GetFromSchema,
  selection: FieldNode,
  relationship: RelationshipConfig
) => {
  const { joinColumns, onExpressions } = getJoinExpressions(relationship)
  const entityConfig = {
    ...relationship,
    joinColumns,
  }
  const select = getSelect(schema, entityConfig, selection)
  return `left join (${select}) ${relationship.name} on ${onExpressions}` // FIXME agg_list is empty
}

const handleRelationship = (
  schema: GetFromSchema,
  parent: EntityConfig,
  selection: FieldNode
): string => {
  const config = schema(parent, selection)
  if (!config) throw new Error(`No ${selection.name} in ${parent.name}`)
  const relationshipConfig = {
    ...config,
    source: parent.name,
    name: selection.name.value,
  }
  return getRelationship(schema, selection, relationshipConfig)
}

const getSelections = (
  schema: GetFromSchema,
  config: EntityConfig,
  selectionSet: SelectionSetNode
) => {
  const result: string[] = []
  const joins: string[] = []
  for (const selection of selectionSet.selections)
    if (isField(selection)) {
      result.push(getField(config.name, selection))
      if (selection.selectionSet?.selections.length)
        joins.push(handleRelationship(schema, config, selection))
    }
  return {
    selections: `agg_list(<|${result.join(',')}|>) as ${ROWS}`,
    joins,
  }
}

const getField = (
  correlationName: string,
  { alias, name, selectionSet }: FieldNode
) => {
  const fieldAlias = alias?.value || name.value
  const fieldName = selectionSet?.selections.length
    ? `${name.value}.${ROWS}`
    : `${correlationName}.${name.value}`
  return `${fieldAlias}:${fieldName}`
}

export const getJoinExpressions = ({
  name,
  source,
  columnMapping,
}: RelationshipConfig) => {
  const joinColumns: string[] = []
  const predicates: string[] = []
  for (const { sourceColumn, targetColumn } of columnMapping) {
    joinColumns.push(targetColumn)
    predicates.push(`${source}.${sourceColumn} = ${name}.${targetColumn}`)
  }
  return {
    joinColumns: joinColumns.join(','),
    onExpressions: predicates.join(' and '),
  }
}

const isField = (selection: SelectionNode): selection is FieldNode => {
  const test = selection.kind === Kind.FIELD
  if (!test) throw new Error('Only Fields are supported')
  return test
}

const getRelationshipHandler =
  (schema: Schema, views: Set<string>): GetFromSchema =>
  (parent, field) => {
    const config = schema.get(`${parent.tableName}.${field.name.value}`)
    if (config?.view) views.add(config?.view)
    return config
  }

export type EntityConfig = {
  name: string
  tableName: string
  joinColumns: string
}

type RelationshipConfig = Relationship & {
  name: string
  source: string
}

export type GetFromSchema = (
  parent: Pick<EntityConfig, 'tableName'>,
  field: ObjectFieldNode | FieldNode
) => Relationship | undefined

export default convert
