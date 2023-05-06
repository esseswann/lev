import {
  FieldNode,
  Kind,
  ObjectFieldNode,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode
} from 'graphql'
import getArguments from './args'
import { Cardinality, Relationship, Schema } from './metadata'
import getVariable from './variables'

const DATA = 'data'
const QUERY: RelationshipConfig = {
  name: 'query',
  alias: 'query',
  mapping: [],
  view: '',
  source: 'query',
  cardinality: 'many'
}

const convert = (schema: Schema, operation: OperationDefinitionNode) => {
  const expressions = new Set<string>()
  const getFromSchema = getRelationshipHandler(schema, expressions)
  if (operation.variableDefinitions)
    for (const variable of operation.variableDefinitions)
      expressions.add(getVariable(variable))
  for (const selection of operation.selectionSet.selections)
    if (isField(selection))
      expressions.add(
        handleRelationship(getFromSchema, QUERY, selection, getSelect)
      )
  return [...expressions.values()].join('\n')
}

const getSelect = (
  getFromSchema: GetFromSchema,
  config: RelationshipConfig,
  selection: FieldNode
) => {
  let { selections, joins } = getSelections(
    getFromSchema,
    config,
    selection.selectionSet!
  )
  let groupBy = ''
  if (config.mapping.length) {
    const joinColumns = config.mapping.map(({ target }) => target)
    selections += `, ${joinColumns}`
    groupBy = `group by ${joinColumns}`
  }
  const tail = [config.alias]
  const args = getArguments(getFromSchema, config, selection.arguments!)
  tail.push(joins.concat([...args.joins]).join(' '))
  if (args.where.size) tail.push(`where ${[...args.where].join(' and ')}`)
  if (args.orderBy.size) tail.push(`order by ${[...args.orderBy].join(',')}`)
  if (groupBy) tail.push(groupBy)
  const preparedTail = tail.join(' ')
  return `select ${selections} from $${config.name} as ${preparedTail}`
}

const getRelationship = (
  schema: GetFromSchema,
  relationship: RelationshipConfig,
  selection: FieldNode
) => {
  const onExpressions = getJoinExpressions(relationship)
  relationship.alias = selection.name.value
  const select = getSelect(schema, relationship, selection)
  return `left join (${select}) as ${relationship.alias} on ${onExpressions}`
  // FIXME when agg_list is empty so it does not return empty array
}

const handleRelationship = (
  getFromSchema: GetFromSchema,
  parent: RelationshipConfig,
  selection: FieldNode,
  handler: (
    schema: GetFromSchema,
    relationship: RelationshipConfig & RelationshipConfig,
    selection: FieldNode
  ) => string
): string => {
  const config = getFromSchema(parent, selection)
  if (!config) throw new Error(`No ${selection.name.value} in ${parent.alias}`)
  const relationshipConfig = {
    ...config,
    alias: selection.name.value,
    source: parent.alias
  }
  return handler(getFromSchema, relationshipConfig, selection)
}

const getSelections = (
  getFromSchema: GetFromSchema,
  config: RelationshipConfig,
  selectionSet: SelectionSetNode
) => {
  const result: string[] = []
  const joins: string[] = []
  for (const selection of selectionSet.selections)
    if (isField(selection)) {
      result.push(getField(config.alias, selection))
      if (selection.selectionSet?.selections.length)
        joins.push(
          handleRelationship(getFromSchema, config, selection, getRelationship)
        )
    }
  const cardinality = cardinalities[config.cardinality]
  const selections = `${cardinality(result)} as ${DATA}`
  return { selections, joins }
}

const cardinalities: Record<Cardinality, (result: string[]) => string> = {
  one: (result) => `<|${result.join(',')}|>`,
  many: (result) => `agg_list(${cardinalities.one(result)})`
}

const getField = (
  correlationName: string,
  { alias, name, selectionSet }: FieldNode
) => {
  const fieldAlias = alias?.value || name.value
  const fieldName = selectionSet?.selections.length
    ? `${name.value}.${DATA}`
    : `${correlationName}.${name.value}`
  return `${fieldAlias}:${fieldName}`
}

export const getJoinExpressions = ({
  alias,
  source,
  mapping
}: RelationshipConfig) =>
  mapping
    .map((link) => `${source}.${link.source} = ${alias}.${link.target}`)
    .join(' and ')

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

export type RelationshipConfig = Relationship & {
  alias: string
  source: string
}

export type GetFromSchema = (
  parent: Pick<RelationshipConfig, 'name'>,
  field: ObjectFieldNode | FieldNode
) => Relationship | undefined

export default convert
