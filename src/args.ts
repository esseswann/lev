import {
  ArgumentNode,
  BooleanValueNode,
  IntValueNode,
  Kind,
  ObjectFieldNode,
  ObjectValueNode,
  StringValueNode,
  ValueNode,
} from 'graphql'
import {
  EntityConfig,
  GetFromSchema,
  Relationship,
  getJoinExpressions,
} from '.'

const getArguments = (
  schema: GetFromSchema,
  parent: EntityConfig,
  args: readonly ArgumentNode[]
) => {
  const result: Result = {
    joins: [],
    where: [],
    orderBy: [],
  }
  for (const arg of args)
    if (isObject(arg.value))
      switch (arg.name.value) {
        case 'where':
          for (const { kind, data } of handleWhere(schema, parent, arg.value))
            result[kind].push(data)
          break
        default:
          throw new Error(`Unknown top level argument ${arg.name.value}`)
      }
  return result
}

function* handleWhere(
  schema: GetFromSchema,
  parent: EntityConfig,
  value: ObjectValueNode
) {
  for (const field of value.fields) {
    const relationship = schema(parent, field)
    yield* relationship
      ? handleRelationship(schema, parent, field, relationship)
      : handleWhereField(parent, field)
  }
}

function* handleRelationship(
  schema: GetFromSchema,
  parent: EntityConfig,
  field: ObjectFieldNode,
  relationship: Relationship
): Output {
  const name = `relationship_${field.name.value}`
  const relationshipConfig = {
    ...relationship,
    name,
    source: parent.name,
    joinColumns: '',
  }
  const { onExpressions } = getJoinExpressions(relationshipConfig)
  yield {
    kind: 'joins',
    data: `left join \`${relationship.tableName}\` ${name} on ${onExpressions}`,
  }
  if (isObject(field.value))
    yield* handleWhere(schema, relationshipConfig, field.value)
}

function* handleWhereField(
  parent: EntityConfig,
  field: ObjectFieldNode
): Output {
  if (isObject(field.value))
    for (const predicate of field.value.fields) {
      const handler = equalityHandlers[predicate.name.value]
      if (handler) {
        const left = getLeft(parent, field)
        yield {
          kind: 'where',
          data: handler(left, predicate),
        }
      } else throw new Error(`No handler for ${predicate.name.value}`)
    }
}

const getLeft = (parent: EntityConfig, field: ObjectFieldNode) =>
  `${parent.name}.${field.name.value}`

const equalityHandlers: Record<string, EqualityHandler> = {
  _eq(left, field) {
    const value = field.value as PrimitiveValues
    return `${left} = ${value.value}`
  },
  _gte(left, field) {
    const value = field.value as PrimitiveValues
    return `${left} > ${value.value}`
  },
}

const isObject = (
  field: ArgumentNode | ValueNode
): field is ObjectValueNode => {
  const test = field.kind === Kind.OBJECT
  if (!test) throw new Error('Should be object')
  return test
}

type Result = {
  joins: string[]
  where: string[]
  orderBy: string[]
}

type Output = Generator<{ kind: keyof Result; data: string }>

type EqualityHandler = (left: string, field: ObjectFieldNode) => string

type PrimitiveValues = StringValueNode | IntValueNode | BooleanValueNode

export default getArguments
