import {
  ArgumentNode,
  FieldNode,
  SelectionNode,
  SelectionSetNode
} from 'graphql'
import {
  GetFromSchema,
  RelationshipConfig,
  getAliasedName,
  getRelationshipHandler,
  isField
} from '.'
import getArguments from './args'
import { Schema } from './metadata'

const getQuery = (schema: Schema, selectionSet: SelectionSetNode) => {
  const fields = selectionSet.selections.filter(isField)
  const views = new Set<string>()
  const getFromSchema = getRelationshipHandler(schema, views)
  const expressions: string[] = []
  const selects: string[] = []
  const config = {
    binding: '$query',
    name: 'query'
  }
  const entities = handleEntities(getFromSchema, config, fields)
  for (const { expression, binding } of entities) {
    expressions.push(expression)
    selects.push(`select * from ${binding};`)
  }
  return [...views].concat(expressions).concat(selects).join('\n')
}

const TABLE = 't'
const PARENT = 'p'

function* handleEntities(
  getFromSchema: GetFromSchema,
  parent: Parent,
  fields: readonly SelectionNode[]
): Generator<Output> {
  for (const field of fields) {
    if (isField(field)) {
      const selections = field.selectionSet?.selections
      if (selections?.length) {
        const result = handleEntity(getFromSchema, parent, field)
        yield result
        yield* handleEntities(getFromSchema, result, selections)
      }
    }
  }
}

const handleEntity = (
  getFromSchema: GetFromSchema,
  parent: Parent,
  field: FieldNode
): Output => {
  const config = getFromSchema(parent, field)
  if (!config)
    throw new Error(
      `No config present for ${field.name.value} in ${parent.name}`
    )
  const binding = `${parent.binding}_${getAliasedName(field)}`
  const select = `select ${TABLE}.* from $${config.name} ${TABLE}`
  const result = [binding, '=', select]
  if (config.mapping.length) {
    result.push(`join ${parent.binding} ${PARENT} on`)
    const expressions = []
    for (const { source, target } of config.mapping)
      expressions.push(`${PARENT}.${source} = ${TABLE}.${target}`)
    result.push(expressions.join(' and '))
  }
  if (field.arguments?.length)
    result.push(handleArguments(getFromSchema, config, field.arguments))
  const expression = result.join(' ') + ';'
  return { binding, name: config.name, expression }
}

type Output = { binding: string; name: string; expression: string }
type Parent = { binding: string; name: string }

const handleArguments = (
  getFromSchema: GetFromSchema,
  config: RelationshipConfig,
  args: readonly ArgumentNode[]
) => {
  const result = []
  config.alias = TABLE // FIXME
  const output = getArguments(getFromSchema, config, args)
  for (const join of output.joins) result.push(join)
  if (output.where.size) result.push(appendWith('where', ' and ', output.where))
  if (output.orderBy.size)
    result.push(appendWith('order by', ',', output.orderBy))
  return result.join(' ')
}

const appendWith = (prefix: string, separator: string, set: Set<string>) =>
  `${prefix} ${[...set.values()].join(separator)}`

export default getQuery
