import {
  FieldNode,
  Kind,
  ObjectFieldNode,
  OperationDefinitionNode,
  SelectionNode
} from 'graphql'
import getArguments from './args'
import { Cardinality, Relationship, Schema } from './metadata'

const DATA = 'data'
const QUERY: RelationshipConfig = {
  name: 'query',
  alias: 'query',
  mapping: [],
  view: '',
  source: 'query',
  cardinality: 'one',
  fields: {}
}

const convert = (schema: Schema, operation: OperationDefinitionNode) => {
  const views = new Set<string>()
  const expressions: string[] = []
  const getFromSchema = getRelationshipHandler(schema, views)
  const select = handleRoot(
    getFromSchema,
    QUERY,
    operation.selectionSet.selections
  )
  return [...views.values(), select].join('\n')
}

const handleRoot = (
  getFromSchema: GetFromSchema,
  config: RelationshipConfig,
  selections: readonly SelectionNode[]
) => {
  const selectionSet = getSelectionSet(config, selections).join(',')
  let result = `select ${selectionSet} `
  const joins = []
  for (const field of selections)
    if (isField(field)) {
      const select = handleRelationship(getFromSchema, QUERY, field, getSelect)
      const payload = `(${select}) as ${getAliasedName(field)}`
      const prefix: string = joins.length ? 'cross join' : 'from'
      joins.push(`${prefix} ${payload}`)
    }
  return result + joins.join('\n')
}

const getSelect = (
  getFromSchema: GetFromSchema,
  config: RelationshipConfig,
  selection: FieldNode
) => {
  const fields = selection.selectionSet!.selections
  const selections = getSelectionSet(config, fields)
  const joins = getJoins(getFromSchema, config, fields)
  const groupBy = []
  for (const link of config.mapping) {
    const name = `${config.name}.${link.target} as ${link.target}`
    selections.push(name)
    if (config.cardinality === 'many') groupBy.push(name)
  }
  const tail = [config.alias]
  const args = getArguments(getFromSchema, config, selection.arguments!)
  tail.push(joins.concat([...args.joins]).join(' '))
  if (args.where.size) tail.push(`where ${[...args.where].join(' and ')}`)
  if (args.orderBy.size) tail.push(`order by ${[...args.orderBy].join(',')}`)
  if (groupBy.length) tail.push(`group by ${groupBy.join(',')}`)
  const preparedTail = tail.join(' ')
  return `select ${selections.join(',')} from $${
    config.name
  } as ${preparedTail}`
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

const getJoins = (
  getFromSchema: GetFromSchema,
  config: RelationshipConfig,
  selections: readonly SelectionNode[]
) => {
  const result: string[] = []
  for (const selection of selections)
    if (isField(selection) && selection.selectionSet?.selections.length)
      result.push(
        handleRelationship(getFromSchema, config, selection, getRelationship)
      )
  return result
}

export const getSelectionSet = (
  config: RelationshipConfig,
  selections: readonly SelectionNode[]
) => {
  const result = []
  for (const selection of selections)
    if (isField(selection)) result.push(getField(config.alias, selection))
  const cardinality = cardinalities[config.cardinality]
  return [`${cardinality(result)} as ${DATA}`]
}

const cardinalities: Record<Cardinality, (result: string[]) => string> = {
  one: (result) => `<|${result.join(',')}|>`,
  many: (result) => `agg_list(${cardinalities.one(result)})`
}

const getField = (correlationName: string, field: FieldNode) => {
  const name = field.name.value
  const fieldName = field.selectionSet?.selections.length
    ? `${name}.${DATA}`
    : `${correlationName}.${name}`
  return `${getAliasedName(field)}:${fieldName}`
}

export const getAliasedName = (field: FieldNode) =>
  field.alias?.value || field.name.value

export const getJoinExpressions = ({
  alias,
  source,
  mapping
}: RelationshipConfig) =>
  mapping
    .map((link) => `${source}.${link.source} = ${alias}.${link.target}`)
    .join(' and ')

export const isField = (selection: SelectionNode): selection is FieldNode => {
  const test = selection.kind === Kind.FIELD
  if (!test) throw new Error('Only Fields are supported')
  return test
}

export const getRelationshipHandler =
  (schema: Schema, views: Set<string>): GetFromSchema =>
  (parent, field) => {
    const config = schema.get(`${parent.name}.${field.name.value}`)
    if (config) {
      if (config.view) views.add(config.view)
      return {
        ...config,
        alias: field.name.value,
        source: parent.name
      }
    }
    return undefined
  }

export type RelationshipConfig = Relationship & {
  alias: string
  source: string
}

export type GetFromSchema = (
  parent: Pick<RelationshipConfig, 'name'>,
  field: ObjectFieldNode | FieldNode
) => RelationshipConfig | undefined

export default convert
