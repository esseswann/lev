import { ConstValueNode, Kind, VariableDefinitionNode } from 'graphql'

const getVariable = (variable: VariableDefinitionNode) =>
  getHandler(variable.type)(variable)

const getHandler = (type: VariableDefinitionNode['type']): Handler => {
  switch (type.kind) {
    case Kind.NAMED_TYPE:
      return handleNamedType
    case Kind.NON_NULL_TYPE:
      return getHandler(type)
    case Kind.LIST_TYPE:
      throw new Error('List type non implemented')
  }
}

const handleNamedType: Handler = (variable) => {
  if (!variable.defaultValue)
    throw new Error('Only variables with default value are supported')
  let result = `$${variable.variable.name.value} = ${handleDefaultValue(
    variable.defaultValue
  )}`
  return result
}

const handleDefaultValue = (value: ConstValueNode): string => {
  switch (value.kind) {
    case Kind.NULL:
      return 'null'
    case Kind.INT:
    case Kind.FLOAT:
    case Kind.STRING:
      return value.value
    case Kind.BOOLEAN:
      return value.value.toString()
    case Kind.ENUM:
    case Kind.LIST:
    case Kind.OBJECT:
      throw new Error('Unsupported type')
  }
}

type Handler = (variable: VariableDefinitionNode) => string

export default getVariable
