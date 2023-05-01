import { ObjectValueNode } from 'graphql'
import { Output } from '.'
import { EntityConfig, GetFromSchema } from '..'

function* orderBy(
  schema: GetFromSchema,
  parent: EntityConfig,
  value: ObjectValueNode
): Output {
  for (const field of value.fields) {
  }
}

export default orderBy
