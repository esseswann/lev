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

const ROWS = 'rows'

const convert = (schema: Schema, query: OperationDefinitionNode) => {
  const getFromSchema = getRelationshipHandler(schema)
  return query.selectionSet.selections
    .filter(isField)
    .map((selection) =>
      getSelect(getFromSchema, getConfig(selection), selection)
    )
}

const getConfig = (selection: FieldNode) => {
  const name = selection.name.value
  return {
    name,
    tableName: getToplevelName(name),
    joinColumns: '',
  }
}

const getToplevelName = (name: string) => name.replace('_', '/')

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
  const args = getArguments(schema, config, selection.arguments!)
  const where = args.where.length ? `where ${args.where.join(' and ')}` : ''
  const preparedJoins = joins.concat(args.joins).join(' ')
  return `select ${selections} from \`${config.tableName}\` as ${config.name} ${preparedJoins} ${where} ${groupBy}`
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
  (schema: Schema): GetFromSchema =>
  (parent, field) =>
    schema.get(`${parent.tableName}.${field.name.value}`)

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
  parent: EntityConfig,
  field: ObjectFieldNode | FieldNode
) => Relationship | undefined

export default convert
