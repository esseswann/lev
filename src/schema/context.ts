export type ConverterContext = {
  path: string[]
  typeNameCase: (input: string) => string
  fieldNameCase: (input: string) => string
}
