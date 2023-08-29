import camelCase from 'lodash/fp/camelCase'
import flow from 'lodash/fp/flow'
import replace from 'lodash/fp/replace'
import startCase from 'lodash/fp/startCase'

const pascalCase = flow(startCase, replace(/ /g, ''))

const caseConverters = {
  camelCase,
  pascalCase
}

export default caseConverters
