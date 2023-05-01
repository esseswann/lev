import {
  BooleanValueNode,
  IntValueNode,
  ObjectFieldNode,
  StringValueNode,
} from 'graphql'

const operators: Record<string, EqualityHandler> = {
  _eq(left, field) {
    const value = field.value as PrimitiveValues
    return `${left} = ${value.value}`
  },
  _gte(left, field) {
    const value = field.value as PrimitiveValues
    return `${left} > ${value.value}`
  },
}

type EqualityHandler = (left: string, field: ObjectFieldNode) => string
type PrimitiveValues = StringValueNode | IntValueNode | BooleanValueNode

export default operators
