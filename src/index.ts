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
    if (isField(selection))
      expressions.add(getRootExpression(getFromSchema, selection))
  return [...expressions.values()].join('\n')
}

const getRootExpression = (
  getFromSchema: GetFromSchema,
  selection: FieldNode
) => {
  const relationship = getFromSchema({ name: 'query' }, selection)
  if (!relationship)
    throw new Error(
      `Unknown root field ${selection.name.value}. Did you forget to add a view for it?`
    )
  const config = {
    name: relationship.name,
    alias: relationship.name,
    view: relationship.view,
    joinColumns: '',
  }
  return getSelect(getFromSchema, config, selection)
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
  const tail = [config.alias]
  const args = getArguments(schema, config, selection.arguments!)
  tail.push(joins.concat([...args.joins]).join(' '))
  if (args.where.size) tail.push(`where ${[...args.where].join(' and ')}`)
  if (args.orderBy.size) tail.push(`order by ${[...args.orderBy].join(',')}`)
  if (groupBy) tail.push(groupBy)
  const preparedTail = tail.join(' ')
  return `select ${selections} from $${config.name} as ${preparedTail}`
}

const getRelationship = (
  schema: GetFromSchema,
  selection: FieldNode,
  relationship: RelationshipConfig
) => {
  const { joinColumns, onExpressions } = getJoinExpressions(relationship)
  const entityConfig = {
    alias: selection.name.value,
    name: relationship.name,
    joinColumns,
  }
  const select = getSelect(schema, entityConfig, selection)
  return `left join (${select}) as ${relationship.alias} on ${onExpressions}` // FIXME agg_list is empty
}

const handleRelationship = (
  schema: GetFromSchema,
  parent: EntityConfig,
  selection: FieldNode
): string => {
  const config = schema(parent, selection)
  if (!config) throw new Error(`No ${selection.name} in ${parent.alias}`)
  console.log(config.name, selection.name.value)
  const relationshipConfig = {
    ...config,
    alias: selection.name.value,
    source: parent.alias,
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
      result.push(getField(config.alias, selection))
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
  alias,
  source,
  mapping: columnMapping,
}: RelationshipConfig) => {
  const joinColumns: string[] = []
  const predicates: string[] = []
  for (const mapping of columnMapping) {
    joinColumns.push(mapping.target)
    predicates.push(`${source}.${mapping.source} = ${alias}.${mapping.target}`)
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
    const config = schema.get(`${parent.name}.${field.name.value}`)
    if (config?.view) views.add(config.view)
    return config
  }

export type EntityConfig = {
  name: string
  alias: string
  joinColumns: string
}

type RelationshipConfig = Relationship & { alias: string; source: string }

export type GetFromSchema = (
  parent: Pick<EntityConfig, 'name'>,
  field: ObjectFieldNode | FieldNode
) => Relationship | undefined

export default convert
