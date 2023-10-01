const cleanQuery = (str: string) => {
  // symbols that need no spaces around them
  const tightSymbols = `,;:\\(\\)\\[\\]<>`

  let cleaned = str
    .replace(/--.*/g, '') // remove single line comments
    .replace(/\/\*[^]*?\*\//g, '') // remove multi-line comments
    .replace(/\s{1,}/g, ' ') // remove newlines and extra spaces
    .replace(new RegExp(`\\s?([${tightSymbols}])\\s?`, 'g'), '$1')
    .trim()

  // FIXME This check needs to be checked
  if (cleaned[cleaned.length - 1] !== ';' && cleaned.length > 2) cleaned += ';'

  return cleaned
}

export default cleanQuery
