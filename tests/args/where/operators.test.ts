import { Kind, VariableNode } from 'graphql'
import operators from '../../../src/args/where/operators'

const createMockVariableNode = (value: string): VariableNode => ({
  kind: Kind.VARIABLE,
  name: { kind: Kind.NAME, value }
})

describe('operators', () => {
  const testCases = [
    {
      op: '_eq',
      column: 'columnA',
      param: 'param1',
      expected: 'columnA = $param1'
    },
    {
      op: '_gte',
      column: 'columnB',
      param: 'param2',
      expected: 'columnB > $param2'
    }
  ]

  testCases.forEach(({ op, column, param, expected }) => {
    describe(op, () => {
      it(`should generate the correct SQL string for ${op}`, () => {
        const mockVariableNode = createMockVariableNode(param)
        const result = operators[op](column, mockVariableNode)
        expect(result).toBe(expected)
      })
    })
  })
})
