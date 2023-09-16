import fs from 'fs/promises'
import { getTemplates, prepareQuery } from '../../src/metadata/compileTemplates'

describe('getTemplates', () => {
  beforeAll(() => {
    jest.mock('fs')
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns an empty map if the path does not exist', async () => {
    fs.stat = jest.fn().mockRejectedValueOnce(new Error('Path not accessible'))

    const result = await getTemplates('/tmp/metadata/templates')
    expect(result.size).toBe(0)
  })

  it('returns an empty map if the path is not a directory', async () => {
    fs.stat = jest
      .fn()
      .mockResolvedValueOnce({ isDirectory: () => false } as any)

    const result = await getTemplates('/tmp/metadata/templates')
    expect(result.size).toBe(0)
  })
})

describe('prepareQuery', () => {
  it('appends a semicolon if not present', () => {
    const input = '$foobar = select * from `foo/bar`'
    const expected = '$foobar = select * from `foo/bar`;'

    const result = prepareQuery(input)

    expect(result).toBe(expected)
  })

  it('minifies a SQL query', () => {
    const input = `-- This is a single line comment
                   $foobar = select *
                               from \`foo/bar\`;
                   /* This is a
                      multi-line comment */`
    const expected = '$foobar = select * from `foo/bar`;'

    const result = prepareQuery(input)

    expect(result).toBe(expected)
  })
})
