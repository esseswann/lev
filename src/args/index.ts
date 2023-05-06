import { ArgumentNode, Kind, ObjectValueNode, ValueNode } from 'graphql'
import { GetFromSchema, RelationshipConfig } from '..'
import where from './where'

const getArguments = (
  schema: GetFromSchema,
  parent: RelationshipConfig,
  args: readonly ArgumentNode[]
) => {
  const result: Result = {
    joins: new Set(),
    where: new Set(),
    orderBy: new Set()
  }
  for (const arg of args)
    if (isObject(arg.value)) {
      const value = arg.name.value
      const handler = handlers[value]
      if (!handler) throw new Error(`Unknown top level argument ${value}`)
      for (const { kind, data } of handler(schema, parent, arg.value))
        result[kind].add(data)
    }
  return result
}

const handlers: Record<string, Handler> = {
  where
  // orderBy,
}

export const isObject = (
  field: ArgumentNode | ValueNode
): field is ObjectValueNode => {
  const test = field.kind === Kind.OBJECT
  if (!test) throw new Error('Should be object')
  return test
}

export type Handler = (
  schema: GetFromSchema,
  parent: RelationshipConfig,
  value: ObjectValueNode
) => Output

type Result = {
  joins: Set<string>
  where: Set<string>
  orderBy: Set<string>
}

export type Output = Generator<{ kind: keyof Result; data: string }>

export default getArguments
