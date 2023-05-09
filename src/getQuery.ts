import { ArgumentNode, FieldNode, SelectionSetNode } from 'graphql'
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
  for (const field of fields) {
    const config = {
      query: '$query',
      name: 'query'
    }
    const { name, expression } = handleEntity(getFromSchema, config, field)
    expressions.push(expression)
    selects.push(`select * from ${name};`)
  }
  return [...views].concat(expressions).concat(selects).join('\n')
}

const TABLE = 't'
const PARENT = 'p'

const handleEntity = (
  getFromSchema: GetFromSchema,
  parent: { query: string; name: string },
  field: FieldNode
) => {
  const config = getFromSchema(parent, field)
  if (!config) throw new Error('')
  const name = `${parent.query}_${getAliasedName(field)}`
  const select = `select ${TABLE}.*`
  const from = `from $${config.name} ${TABLE}`
  const result = [name, '=', select, from]
  if (config.mapping.length) {
    result.push(`join ${config.name} ${PARENT}`)
    for (const { source, target } of config.mapping)
      result.push(`${PARENT}.${source} = ${TABLE}.${target}`)
  }
  if (field.arguments?.length)
    result.push(handleArguments(getFromSchema, config, field.arguments))
  const expression = result.join(' ') + ';'
  return { name, expression }
}

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
