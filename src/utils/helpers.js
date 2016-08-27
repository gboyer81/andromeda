import {
  addIndex,
  filter,
  forEach,
  join,
  map,
  path,
  reduce,
} from 'ramda'

export const eventCheckedPath = path(['currentTarget', 'checked'])
export const eventValuePath = path(['currentTarget', 'value'])
export const forEachIndexed = addIndex(forEach)
export const mapIndexed = addIndex(map)
export const randomElement = xs => xs[Math.floor(Math.random() * xs.length)]
export const reduceIndexed = addIndex(reduce)
export const noop = () => {}
export const makeClassName = (...xs) => join(' ', filter(Boolean, xs))
