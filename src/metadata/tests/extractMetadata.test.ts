import { prepareQuery } from '../compileTemplates'

describe('prepareView', () => {
  it('should append a semicolon if not present', () => {
    const input = '$foobar = select * from `foo/bar`'
    const expected = '$foobar = select * from `foo/bar`;'
    console.log(prepareQuery(input))
    expect(prepareQuery(input)).toBe(expected)
  })

  it('should correctly minify a SQL view', () => {
    const input = `-- This is a single line comment
                   $foobar = select *
                               from \`foo/bar\`;
                   /* This is a
                      multi-line comment */`
    const expected = '$foobar = select * from `foo/bar`;'
    expect(prepareQuery(input)).toBe(expected)
  })
})
