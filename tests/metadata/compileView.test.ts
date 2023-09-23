import cleanQuery from '../../src/metadata/cleanQuery'

describe('cleanQuery', () => {
  it('appends a semicolon if not present', () => {
    const input = '$foobar = select * from `foo/bar`'
    const expected = '$foobar = select * from `foo/bar`;'

    const result = cleanQuery(input)

    expect(result).toBe(expected)
  })

  it('minifies a SQL query', () => {
    const input = `-- This is a single line comment
                   $foobar = select *
                               from \`foo/bar\`;
                   /* This is a
                      multi-line comment */`
    const expected = '$foobar = select * from `foo/bar`;'

    const result = cleanQuery(input)

    expect(result).toBe(expected)
  })
})
