import { Kind, VariableDefinitionNode } from 'graphql'

const getVariable = (variable: VariableDefinitionNode) => {
  if (
    variable.type.kind !== Kind.NAMED_TYPE ||
    variable.defaultValue?.kind === Kind.LIST ||
    variable.defaultValue?.kind === Kind.OBJECT ||
    variable.defaultValue?.kind === Kind.NULL
  )
    throw new Error('Only named types are supported')
  return `$${variable.variable.name.value} = Cast('${variable.defaultValue?.value}' as ${variable.type.name.value});`
}

export default getVariable
