import {lazyMap} from './lazyIterables'
import {
  addIndex,
  curry,
  forEach,
  identity,
  map,
  path,
  reduce
} from 'ramda'
import {connect} from 'react-redux'

export const decimalPart = n => {
  const str = String(n)
  const indexOfDecimal = str.indexOf('.')
  return indexOfDecimal === -1
    ? 0
    : Number('0' + str.slice(indexOfDecimal, Infinity))
}
export const clamp = curry((a, b, c) => c < a ? a : c > b ? b : c)
export const eventCheckedPath = path(['currentTarget', 'checked'])
export const eventValuePath = path(['currentTarget', 'value'])
export const forEachIndexed = addIndex(forEach)
export const lazyMapIndexed = addIndex(lazyMap)
export const mapIndexed = addIndex(map)
export const randomElement = xs => xs[Math.floor(Math.random() * xs.length)]
export const reduceIndexed = addIndex(reduce)
export const rawConnect = connect(identity)
