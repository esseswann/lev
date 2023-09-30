import cleanQuery from './cleanQuery'

export const extractSections = (view: string): TemplateSections => {
  const declaresRegex = /declare\s+\$(?<key>\w+)\s+as\s+(?<type>.+?)(?:;|$)/gm
  const cleaned = cleanQuery(view)

  const declares = new Map<string, Declare>()
  let match
  while ((match = declaresRegex.exec(cleaned)) !== null)
    if (match.groups) declares.set(match.groups['key'], match.groups as Declare)

  const body = cleaned.replaceAll(declaresRegex, '').trim()

  return { declares, body }
}

export const compileSections = (sections: TemplateSections): string =>
  compileDeclares(sections.declares) + sections.body

export const mergeDeclares = (left: Declares, right: Declares) => {
  for (const [key, value] of right) {
    const current = left.get(key)
    if (!current) left.set(key, value)
    else if (current.type !== value.type)
      throw new Error(
        `Encountered conflict for declare ${key}, current ${current.type} incoming ${value.type}`
      )
  }
  return left
}

export const compileDeclares = (declares: Declares) => {
  let result = ''
  for (const declare of declares) result += compileDeclare(declare)
  return result
}

const compileDeclare = (declare: [string, Declare]): string => {
  const [key, { type, defaultValue }] = declare
  let base = `declare $${key} as ${type}`
  if (defaultValue) base += ` = ${defaultValue}`
  return `${base};`
}

export type TemplateSections = {
  declares: Declares
  body: string
}

type Declares = Map<string, Declare>

type Declare = {
  type: string
  defaultValue?: string
}
