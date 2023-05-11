import { VariableNode } from 'graphql'

const operators: Record<string, EqualityHandler> = {
  _eq(left, field) {
    const value = field.name.value
    return `${left} = $${value}`
  },
  _gte(left, field) {
    const value = field.name.value
    return `${left} > $${field.name.value}`
  }
}

type EqualityHandler = (left: string, field: VariableNode) => string

export default operators
