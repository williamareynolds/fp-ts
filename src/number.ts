/**
 * @since 2.10.0
 */
import * as E from './Eq'
import * as O from './Ord'

/**
 * @category instances
 * @since 2.10.0
 */
export const Eq: E.Eq<number> = E.eqStrict

/**
 * @category instances
 * @since 2.10.0
 */
export const Ord: O.Ord<number> = {
  equals: Eq.equals,
  compare: (x, y) => (x < y ? -1 : x > y ? 1 : 0)
}
