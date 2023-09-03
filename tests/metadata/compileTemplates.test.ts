import { PathLike } from 'fs'
import { getTemplates } from '../../src/metadata/compileTemplates'

describe('getTemplates', () => {
  it('should return an empty map if the directory does not exist', async () => {
    const nonExistentPath: PathLike = 'nonExistentPath'
    const result = await getTemplates(nonExistentPath)
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })
})
