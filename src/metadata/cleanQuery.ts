const cleanQuery = (str: string) => {
  let cleaned = str
    .replace(/--.*/g, '') // remove single line comments
    .replace(/\/\*[^]*?\*\//g, '') // remove multi-line comments
    .replace(/\s{1,}/g, ' ') // minify
    .trim()
  // FIXME This check needs to be checked
  if (cleaned[cleaned.length - 1] !== ';' && cleaned.length > 2) cleaned += ';'
  return cleaned
}

export default cleanQuery
