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
    path: ['query'],
    name: 'query'
  }
  const bindings = []
  const entities = handleEntities(getFromSchema, config, fields)
  for (const output of entities) {
    expressions.push(output.expression)
    selects.push(getSelect(output))
    bindings.push(output.path)
  }
  const query = [...views].concat(expressions).concat(selects).join('\n')
  return { bindings, query }
}

const TABLE = 't'
const PARENT = 'p'
const KEY = 'key'

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
  const path = parent.path.concat(getAliasedName(field))
  const select = `select '${config.name}' as __typename, ${TABLE}.*`
  const from = `from $${config.name} ${TABLE}`
  const result = [`${getBinding(path)}`, '=', select, from]
  const key: string[] = []
  if (config.mapping.length) {
    result.push(`join ${getBinding(parent.path)} ${PARENT} on`)
    const expressions = []
    for (const { source, target } of config.mapping) {
      expressions.push(`${PARENT}.${source} = ${TABLE}.${target}`)
      key.push(target)
    }
    result.push(expressions.join(' and '))
  }
  if (field.arguments?.length)
    result.push(handleArguments(getFromSchema, config, field.arguments))
  const expression = result.join(' ') + ';'
  return {
    key,
    path,
    expression,
    name: config.name,
    selections: field.selectionSet!.selections
  }
}

const getBinding = (path: string[]) => `$${path.join('_')}`

const getSelect = ({ path, selections, key }: Output) => {
  // const config: Record<string, string> = {
  //   data: getFields(selections)
  //   // key: getKey(key)
  // }
  // for (const field of selections)
  //   if (isField(field) && field.selectionSet)
  //     config[`${getAliasedName(field)}_key`] = getKey([])
  // const fields = Object.entries(config).map(handleField).join(', ')
  const fields = `*`
  return `select ${fields} from ${getBinding(path)};`
}

// const getFields = (fields: readonly SelectionNode[]) => {
//   const result = []
//   for (const field of fields)
//     if (isField(field) && !field.selectionSet)
//       result.push(`${getAliasedName(field)}:${field.name.value}`)
//   return `<|${result.join(',')}|>`
// }

const getKey = (key: string[]) =>
  `Yson::GetHash(Yson::From((${key.join(',')})))`

const handleField = ([key, value]: [string, string]) => `${value} as ${key}`

type Parent = { path: string[]; name: string }
type Output = Parent & {
  key: string[]
  expression: string
  selections: readonly SelectionNode[]
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
