import {
  ConstValueNode,
  Kind,
  VariableDefinitionNode,
  VariableNode
} from 'graphql'

const prepareVariables = (
  definitions: VariableDefinitionNode[],
  variables: Record<string, any>
): GetVariable => {
  const map = new Map()
  for (const definition of definitions) {
    const value = definition.variable.name.value
    map.set(value, variables[value])
  }
  return (variable) => map.get(variable.name.value)
}

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
type GetVariable = (variable: VariableNode) => string | number | boolean

export default prepareVariables
