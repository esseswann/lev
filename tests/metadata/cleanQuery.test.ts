import cleanQuery from '../../src/metadata/cleanQuery'

describe('compile view', () => {
  const runCleanQueryTest = (input: string, expected: string) => {
    const result = cleanQuery(input)
    expect(result).toBe(expected)
  }

  describe('minification tests', () => {
    const testCases = [
      {
        description: 'should removes single and multi-line comments',
        input: `
-- This is a single line comment
$foobar = select *
            from \`foo/bar\`;
/* This is a
    multi-line comment */`,
        expected: '$foobar = select * from `foo/bar`;'
      },
      {
        description: 'should remove spaces around specific symbols',
        input: `
-- import connection.sql
declare $input as Struct<
  from: Optional<Datetime>,
  to:  Optional<Datetime>,
  limit: Optional<Uint64>
>;`,
        expected:
          'declare $input as Struct<from:Optional<Datetime>,to:Optional<Datetime>,limit:Optional<Uint64>>;'
      }
    ]

    testCases.forEach(({ description, input, expected }) => {
      it(description, () => {
        runCleanQueryTest(input, expected)
      })
    })
  })

  it('should append a semicolon if not present', () => {
    const input = '$foobar = select * from `foo/bar`'
    const expected = '$foobar = select * from `foo/bar`;'

    runCleanQueryTest(input, expected)
  })
})
