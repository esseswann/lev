import fs from 'fs/promises'
import getTemplates from '../../src/metadata/getTemplates'

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
