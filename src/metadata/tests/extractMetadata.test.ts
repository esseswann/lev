import { prepareView } from '../extractMetadata'

describe('prepareView', () => {
  it('should append a semicolon if not present', () => {
    const input = '$foobar = select * from `foo/bar`'
    const expected = '$foobar = select * from `foo/bar`;'
    console.log(prepareView(input))
    expect(prepareView(input)).toBe(expected)
  })

  it('should correctly minify a SQL view', () => {
    const input = `-- This is a single line comment
                   $foobar = select *
                               from \`foo/bar\`;
                   /* This is a
                      multi-line comment */`
    const expected = '$foobar = select * from `foo/bar`;'
    expect(prepareView(input)).toBe(expected)
  })
})
