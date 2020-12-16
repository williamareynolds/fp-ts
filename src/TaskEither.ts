/**
 * ```ts
 * interface TaskEither<E, A> extends Task<Either<E, A>> {}
 * ```
 *
 * `TaskEither<E, A>` represents an asynchronous computation that either yields a value of type `A` or fails yielding an
 * error of type `E`. If you want to represent an asynchronous computation that never fails, please see `Task`.
 *
 * @since 2.0.0
 */
import { Alt2, Alt2C } from './Alt'
import { Applicative2, Applicative2C } from './Applicative'
import { apFirst_, Apply1, apSecond_ } from './Apply'
import { Bifunctor2 } from './Bifunctor'
import { Compactable2C } from './Compactable'
import * as E from './Either'
import { Filterable2C } from './Filterable'
import { bindTo_, bind_, flow, identity, Lazy, pipe, Predicate, Refinement, tuple } from './function'
import { Functor2 } from './Functor'
import { IO } from './IO'
import { IOEither } from './IOEither'
import { Monad2 } from './Monad'
import { MonadIO2 } from './MonadIO'
import { MonadTask2 } from './MonadTask'
import { MonadThrow2 } from './MonadThrow'
import { Monoid } from './Monoid'
import { getLeft, getRight, Option } from './Option'
import { Semigroup } from './Semigroup'
import * as T from './Task'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Either = E.Either
import Task = T.Task

/**
 * @category model
 * @since 2.0.0
 */
export interface TaskEither<E, A> extends Task<Either<E, A>> {}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 2.0.0
 */
export const left: <E = never, A = never>(e: E) => TaskEither<E, A> =
  /*#__PURE__*/
  flow(E.left, T.of)

/**
 * @category constructors
 * @since 2.0.0
 */
export const right: <E = never, A = never>(a: A) => TaskEither<E, A> =
  /*#__PURE__*/
  flow(E.right, T.of)

/**
 * @category constructors
 * @since 2.0.0
 */
export const rightTask: <E = never, A = never>(ma: Task<A>) => TaskEither<E, A> =
  /*#__PURE__*/
  T.map(E.right)

/**
 * @category constructors
 * @since 2.0.0
 */
export const leftTask: <E = never, A = never>(me: Task<E>) => TaskEither<E, A> =
  /*#__PURE__*/
  T.map(E.left)

/**
 * @category constructors
 * @since 2.0.0
 */
export const rightIO: <E = never, A = never>(ma: IO<A>) => TaskEither<E, A> =
  /*#__PURE__*/
  flow(T.fromIO, rightTask)

/**
 * @category constructors
 * @since 2.0.0
 */
export const leftIO: <E = never, A = never>(me: IO<E>) => TaskEither<E, A> =
  /*#__PURE__*/
  flow(T.fromIO, leftTask)

/**
 * @category constructors
 * @since 2.0.0
 */
export const fromIOEither: <E, A>(fa: IOEither<E, A>) => TaskEither<E, A> = T.fromIO

/**
 * Derivable from `MonadThrow`.
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromEither: <E, A>(ma: E.Either<E, A>) => TaskEither<E, A> =
  /*#__PURE__*/
  E.fold(left, (a) => right(a))

/**
 * Derivable from `MonadThrow`.
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromOption: <E>(onNone: Lazy<E>) => <A>(ma: Option<A>) => TaskEither<E, A> = (onNone) => (ma) =>
  ma._tag === 'None' ? left(onNone()) : right(ma.value)

/**
 * Derivable from `MonadThrow`.
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (a: A) => TaskEither<E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => TaskEither<E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (a: A) => (predicate(a) ? right(a) : left(onFalse(a)))

/**
 * Transforms a `Promise` that may reject to a `Promise` that never rejects and returns an `Either` instead.
 *
 * Note: `f` should never `throw` errors, they are not caught.
 *
 * @example
 * import { left, right } from 'fp-ts/Either'
 * import { tryCatch } from 'fp-ts/TaskEither'
 *
 * tryCatch(() => Promise.resolve(1), String)().then(result => {
 *   assert.deepStrictEqual(result, right(1))
 * })
 * tryCatch(() => Promise.reject('error'), String)().then(result => {
 *   assert.deepStrictEqual(result, left('error'))
 * })
 *
 * @category constructors
 * @since 2.0.0
 */
export function tryCatch<E, A>(f: Lazy<Promise<A>>, onRejected: (reason: unknown) => E): TaskEither<E, A> {
  return () => f().then(E.right, (reason) => E.left(onRejected(reason)))
}

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 2.0.0
 */
export const fold: <E, A, B>(
  onLeft: (e: E) => Task<B>,
  onRight: (a: A) => Task<B>
) => (ma: TaskEither<E, A>) => Task<B> =
  /*#__PURE__*/
  flow(E.fold, T.chain)

/**
 * Less strict version of [`getOrElse`](#getOrElse).
 *
 * @category destructors
 * @since 2.6.0
 */
export const getOrElseW = <E, B>(onLeft: (e: E) => Task<B>) => <A>(ma: TaskEither<E, A>): Task<A | B> =>
  pipe(ma, T.chain(E.fold<E, A, T.Task<A | B>>(onLeft, T.of)))

/**
 * @category destructors
 * @since 2.0.0
 */
export const getOrElse: <E, A>(onLeft: (e: E) => Task<A>) => (ma: TaskEither<E, A>) => Task<A> = getOrElseW

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * Returns `ma` if is a `Right` or the value returned by `onLeft` otherwise.
 *
 * See also [alt](#alt).
 *
 * @example
 * import * as E from 'fp-ts/Either'
 * import { pipe } from 'fp-ts/function'
 * import * as TE from 'fp-ts/TaskEither'
 *
 * async function test() {
 *   const errorHandler = TE.orElse((error: string) => TE.right(`recovering from ${error}...`))
 *   assert.deepStrictEqual(await pipe(TE.right('ok'), errorHandler)(), E.right('ok'))
 *   assert.deepStrictEqual(await pipe(TE.left('ko'), errorHandler)(), E.right('recovering from ko...'))
 * }
 *
 * test()
 *
 * @category combinators
 * @since 2.0.0
 */
export const orElse: <E, A, M>(onLeft: (e: E) => TaskEither<M, A>) => (ma: TaskEither<E, A>) => TaskEither<M, A> = (
  f
) => T.chain(E.fold(f, right))

/**
 * @category combinators
 * @since 2.0.0
 */
export const swap: <E, A>(ma: TaskEither<E, A>) => TaskEither<A, E> =
  /*#__PURE__*/
  T.map(E.swap)

/**
 * Less strict version of [`filterOrElse`](#filterOrElse).
 *
 * @since 2.9.0
 */
export const filterOrElseW: {
  <A, B extends A, E2>(refinement: Refinement<A, B>, onFalse: (a: A) => E2): <E1>(
    ma: TaskEither<E1, A>
  ) => TaskEither<E1 | E2, B>
  <A, E2>(predicate: Predicate<A>, onFalse: (a: A) => E2): <E1>(ma: TaskEither<E1, A>) => TaskEither<E1 | E2, A>
} = <A, E2>(predicate: Predicate<A>, onFalse: (a: A) => E2): (<E1>(ma: TaskEither<E1, A>) => TaskEither<E1 | E2, A>) =>
  chainW((a) => (predicate(a) ? right(a) : left(onFalse(a))))

/**
 * Derivable from `MonadThrow`.
 *
 * @category combinators
 * @since 2.0.0
 */
export const filterOrElse: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (ma: TaskEither<E, A>) => TaskEither<E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: TaskEither<E, A>) => TaskEither<E, A>
} = filterOrElseW

/**
 * Converts a function returning a `Promise` to one returning a `TaskEither`.
 *
 * @category combinators
 * @since 2.5.0
 */
export function tryCatchK<E, A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Promise<B>,
  onRejected: (reason: unknown) => E
): (...a: A) => TaskEither<E, B> {
  return (...a) => tryCatch(() => f(...a), onRejected)
}

/**
 * @category combinators
 * @since 2.4.0
 */
export function fromEitherK<E, A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Either<E, B>
): (...a: A) => TaskEither<E, B> {
  return (...a) => fromEither(f(...a))
}

/**
 * @category combinators
 * @since 2.4.0
 */
export function fromIOEitherK<E, A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => IOEither<E, B>
): (...a: A) => TaskEither<E, B> {
  return (...a) => fromIOEither(f(...a))
}

/**
 * Less strict version of [`chainEitherK`](#chainEitherK).
 *
 * @category combinators
 * @since 2.6.1
 */
export const chainEitherKW: <E, A, B>(
  f: (a: A) => Either<E, B>
) => <D>(ma: TaskEither<D, A>) => TaskEither<D | E, B> = (f) => chainW(fromEitherK(f))

/**
 * @category combinators
 * @since 2.4.0
 */
export const chainEitherK: <E, A, B>(
  f: (a: A) => Either<E, B>
) => (ma: TaskEither<E, A>) => TaskEither<E, B> = chainEitherKW

/**
 * Less strict version of [`chainIOEitherK`](#chainIOEitherK).
 *
 * @category combinators
 * @since 2.6.1
 */
export const chainIOEitherKW: <E, A, B>(
  f: (a: A) => IOEither<E, B>
) => <D>(ma: TaskEither<D, A>) => TaskEither<D | E, B> = (f) => chainW(fromIOEitherK(f))

/**
 * @category combinators
 * @since 2.4.0
 */
export const chainIOEitherK: <E, A, B>(
  f: (a: A) => IOEither<E, B>
) => (ma: TaskEither<E, A>) => TaskEither<E, B> = chainIOEitherKW

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>` whose argument and return types
 * use the type constructor `F` to represent some computational context.
 *
 * @category Functor
 * @since 2.0.0
 */
export const map: <A, B>(f: (a: A) => B) => <E>(fa: TaskEither<E, A>) => TaskEither<E, B> = (f) => T.map(E.map(f))

/**
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 2.0.0
 */
export const bimap: <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => (fa: TaskEither<E, A>) => TaskEither<G, B> =
  /*#__PURE__*/
  flow(E.bimap, T.map)

/**
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 2.0.0
 */
export const mapLeft: <E, G>(f: (e: E) => G) => <A>(fa: TaskEither<E, A>) => TaskEither<G, A> = (f) =>
  T.map(E.mapLeft(f))

/**
 * Less strict version of [`ap`](#ap).
 *
 * @category Apply
 * @since 2.8.0
 */
export const apW = <D, A>(fa: TaskEither<D, A>): (<E, B>(fab: TaskEither<E, (a: A) => B>) => TaskEither<D | E, B>) =>
  flow(
    T.map((gab) => (ga: E.Either<D, A>) => E.apW(ga)(gab)),
    T.ap(fa)
  )

/**
 * Apply a function to an argument under a type constructor.
 *
 * @category Apply
 * @since 2.0.0
 */
export const ap: <E, A>(fa: TaskEither<E, A>) => <B>(fab: TaskEither<E, (a: A) => B>) => TaskEither<E, B> = apW

/**
 * Less strict version of [`chain`](#chain).
 *
 * @category Monad
 * @since 2.6.0
 */
export const chainW = <E, A, B>(f: (a: A) => TaskEither<E, B>) => <D>(ma: TaskEither<D, A>): TaskEither<D | E, B> =>
  pipe(ma, T.chain(E.fold<D, A, TaskEither<D | E, B>>(left, f)))

/**
 * Composes computations in sequence, using the return value of one computation to determine the next computation.
 *
 * @category Monad
 * @since 2.0.0
 */
export const chain: <E, A, B>(f: (a: A) => TaskEither<E, B>) => (ma: TaskEither<E, A>) => TaskEither<E, B> = chainW

/**
 * Less strict version of [`chainFirst`](#chainFirst).
 *
 * Derivable from `Monad`.
 *
 * @category combinators
 * @since 2.8.0
 */
export const chainFirstW: <E, A, B>(
  f: (a: A) => TaskEither<E, B>
) => <D>(first: TaskEither<D, A>) => TaskEither<D | E, A> = (f) =>
  chainW((a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )

/**
 * Composes computations in sequence, using the return value of one computation to determine the next computation and
 * keeping only the result of the first.
 *
 * Derivable from `Monad`.
 *
 * @category combinators
 * @since 2.0.0
 */
export const chainFirst: <E, A, B>(
  f: (a: A) => TaskEither<E, B>
) => (first: TaskEither<E, A>) => TaskEither<E, A> = chainFirstW

/**
 * Derivable from `Monad`.
 *
 * @category combinators
 * @since 2.0.0
 */
export const flatten: <E, A>(mma: TaskEither<E, TaskEither<E, A>>) => TaskEither<E, A> =
  /*#__PURE__*/
  chain(identity)

/**
 * Less strict version of [`alt`](#alt).
 *
 * @category Alt
 * @since 2.9.0
 */
export const altW = <E2, B>(second: Lazy<TaskEither<E2, B>>) => <E1, A>(
  first: TaskEither<E1, A>
): TaskEither<E1 | E2, A | B> => pipe(first, T.chain(E.fold<E1, A, TaskEither<E1 | E2, A | B>>(second, right)))

/**
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to
 * types of kind `* -> *`.
 *
 * In case of `TaskEither` returns `fa` if is a `Right` or the value returned by `that` otherwise.
 *
 * See also [orElse](#orElse).
 *
 * @example
 * import * as E from 'fp-ts/Either'
 * import { pipe } from 'fp-ts/function'
 * import * as TE from 'fp-ts/TaskEither'
 *
 * async function test() {
 *   assert.deepStrictEqual(
 *     await pipe(
 *       TE.right(1),
 *       TE.alt(() => TE.right(2))
 *     )(),
 *     E.right(1)
 *   )
 *   assert.deepStrictEqual(
 *     await pipe(
 *       TE.left('a'),
 *       TE.alt(() => TE.right(2))
 *     )(),
 *     E.right(2)
 *   )
 *   assert.deepStrictEqual(
 *     await pipe(
 *       TE.left('a'),
 *       TE.alt(() => TE.left('b'))
 *     )(),
 *     E.left('b')
 *   )
 * }
 *
 * test()
 *
 * @category Alt
 * @since 2.0.0
 */
export const alt: Alt2<URI>['alt'] = altW

/**
 * Wrap a value into the type constructor.
 *
 * Equivalent to [`right`](#right).
 *
 * @category Applicative
 * @since 2.0.0
 */
export const of: Applicative2<URI>['of'] = right

/**
 * @category MonadIO
 * @since 2.7.0
 */
export const fromIO: MonadIO2<URI>['fromIO'] = rightIO

/**
 * @category MonadTask
 * @since 2.7.0
 */
export const fromTask: MonadTask2<URI>['fromTask'] = rightTask

/**
 * @category MonadTask
 * @since 2.7.0
 */
export const throwError: MonadThrow2<URI>['throwError'] = left

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 2.0.0
 */
export const URI = 'TaskEither'

/**
 * @category instances
 * @since 2.0.0
 */
export type URI = typeof URI

declare module './HKT' {
  interface URItoKind2<E, A> {
    readonly [URI]: TaskEither<E, A>
  }
}

/**
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category instances
 * @since 2.0.0
 */
export function getSemigroup<E, A>(S: Semigroup<A>): Semigroup<TaskEither<E, A>> {
  return T.getSemigroup(E.getSemigroup(S))
}

/**
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are concatenated using the provided `Semigroup`
 *
 * @category instances
 * @since 2.0.0
 */
export function getApplySemigroup<E, A>(S: Semigroup<A>): Semigroup<TaskEither<E, A>> {
  return T.getSemigroup(E.getApplySemigroup(S))
}

/**
 * @category instances
 * @since 2.0.0
 */
export function getApplyMonoid<E, A>(M: Monoid<A>): Monoid<TaskEither<E, A>> {
  return {
    concat: getApplySemigroup<E, A>(M).concat,
    empty: right(M.empty)
  }
}

/**
 * @category instances
 * @since 2.7.0
 */
export function getApplicativeTaskValidation<E>(A: Apply1<T.URI>, SE: Semigroup<E>): Applicative2C<URI, E> {
  const AV = E.getApplicativeValidation(SE)
  const ap = <A>(fga: T.Task<E.Either<E, A>>) => <B>(fgab: T.Task<E.Either<E, (a: A) => B>>): T.Task<E.Either<E, B>> =>
    pipe(
      fgab,
      A.map((h) => (ga: E.Either<E, A>) => pipe(h, AV.ap(ga))),
      A.ap(fga)
    )
  return {
    URI,
    map,
    ap,
    of
  }
}

/**
 * @category instances
 * @since 2.7.0
 */
export function getAltTaskValidation<E>(SE: Semigroup<E>): Alt2C<URI, E> {
  return {
    URI,
    map,
    alt: (second) => (first) =>
      pipe(
        first,
        T.chain((e1) =>
          E.isRight(e1)
            ? T.of(e1)
            : pipe(
                second(),
                T.map((e2) => (E.isLeft(e2) ? E.left(SE.concat(e2.left)(e1.left)) : e2))
              )
        )
      )
  }
}

/**
 * @category instances
 * @since 3.0.0
 */
export function getCompactable<E>(M: Monoid<E>): Compactable2C<URI, E> {
  const C = E.getCompactable(M)
  return {
    URI,
    compact: T.map(C.compact),
    separate: (fe) => ({
      left: pipe(
        fe,
        T.map(
          E.fold(
            E.left,
            E.fold(
              (a) => E.right(a),
              () => E.left(M.empty)
            )
          )
        )
      ),
      right: pipe(
        fe,
        T.map(
          E.fold(
            E.left,
            E.fold(
              () => E.left(M.empty),
              (b) => E.right(b)
            )
          )
        )
      )
    })
  }
}

/**
 * @category instances
 * @since 2.1.0
 */
export function getFilterable<E>(M: Monoid<E>): Filterable2C<URI, E> {
  const F = E.getFilterable(M)

  const filter: <A>(predicate: Predicate<A>) => (fa: TaskEither<E, A>) => TaskEither<E, A> = (predicate) =>
    T.map(F.filter(predicate))
  const filterMap: <A, B>(f: (a: A) => Option<B>) => (fa: TaskEither<E, A>) => TaskEither<E, B> = (f) =>
    T.map(F.filterMap(f))

  return {
    URI,
    filter,
    filterMap,
    partition: <A>(predicate: Predicate<A>) => (fa: TaskEither<E, A>) => {
      const left = pipe(
        fa,
        filter((a) => !predicate(a))
      )
      const right = pipe(fa, filter(predicate))
      return { left, right }
    },
    partitionMap: (f) => (fa) => {
      const left = pipe(
        fa,
        filterMap((a) => getLeft(f(a)))
      )
      const right = pipe(
        fa,
        filterMap((a) => getRight(f(a)))
      )
      return { left, right }
    }
  }
}

/**
 * @category instances
 * @since 2.7.0
 */
export const Functor: Functor2<URI> = {
  URI,
  map
}

/**
 * @category instances
 * @since 2.7.0
 */
export const ApplicativePar: Applicative2<URI> = {
  URI,
  map,
  ap,
  of
}

/**
 * Combine two effectful actions, keeping only the result of the first.
 *
 * Derivable from `Apply`.
 *
 * @category derivable combinators
 * @since 2.0.0
 */
export const apFirst: <E, B>(second: TaskEither<E, B>) => <A>(first: TaskEither<E, A>) => TaskEither<E, A> =
  /*#__PURE__*/
  apFirst_(ApplicativePar)

/**
 * Combine two effectful actions, keeping only the result of the second.
 *
 * Derivable from `Apply`.
 *
 * @category derivable combinators
 * @since 2.0.0
 */
export const apSecond: <E, B>(second: TaskEither<E, B>) => <A>(first: TaskEither<E, A>) => TaskEither<E, B> =
  /*#__PURE__*/
  apSecond_(ApplicativePar)

/**
 * @category instances
 * @since 2.7.0
 */
export const ApplicativeSeq: Applicative2<URI> = {
  URI,
  map,
  ap: (fa) => chain((f) => pipe(fa, map(f))),
  of
}

/**
 * @category instances
 * @since 2.7.0
 */
export const Bifunctor: Bifunctor2<URI> = {
  URI,
  bimap,
  mapLeft
}

/**
 * @category instances
 * @since 2.7.0
 */
export const Alt: Alt2<URI> = {
  URI,
  map,
  alt
}

/**
 * @category instances
 * @since 3.0.0
 */
export const Monad: Monad2<URI> = {
  URI,
  map,
  of,
  chain
}

/**
 * @category instances
 * @since 3.0.0
 */
export const MonadTask: MonadTask2<URI> = {
  URI,
  fromIO,
  fromTask
}

/**
 * @category instances
 * @since 3.0.0
 */
export const MonadThrow: MonadThrow2<URI> = {
  URI,
  throwError
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Convert a node style callback function to one returning a `TaskEither`
 *
 * **Note**. If the function `f` admits multiple overloadings, `taskify` will pick last one. If you want a different
 * behaviour, add an explicit type annotation
 *
 * ```ts
 * // readFile admits multiple overloadings
 *
 * // const readFile: (a: string) => TaskEither<NodeJS.ErrnoException, Buffer>
 * const readFile = taskify(fs.readFile)
 *
 * const readFile2: (filename: string, encoding: string) => TaskEither<NodeJS.ErrnoException, Buffer> = taskify(
 *   fs.readFile
 * )
 * ```
 *
 * @example
 * import { taskify } from 'fp-ts/TaskEither'
 * import * as fs from 'fs'
 *
 * // const stat: (a: string | Buffer) => TaskEither<NodeJS.ErrnoException, fs.Stats>
 * const stat = taskify(fs.stat)
 * assert.strictEqual(stat.length, 0)
 *
 * @since 2.0.0
 */
export function taskify<L, R>(f: (cb: (e: L | null | undefined, r?: R) => void) => void): () => TaskEither<L, R>
export function taskify<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => TaskEither<L, R>
export function taskify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => TaskEither<L, R>
export function taskify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => TaskEither<L, R>
export function taskify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => TaskEither<L, R>
export function taskify<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => TaskEither<L, R>
export function taskify<L, R>(f: Function): () => TaskEither<L, R> {
  return function () {
    const args = Array.prototype.slice.call(arguments)
    return () =>
      new Promise((resolve) => {
        const cbResolver = (e: L, r: R) => (e != null ? resolve(E.left(e)) : resolve(E.right(r)))
        f.apply(null, args.concat(cbResolver))
      })
  }
}

/**
 * Make sure that a resource is cleaned up in the event of an exception (\*). The release action is called regardless of
 * whether the body action throws (\*) or returns.
 *
 * (\*) i.e. returns a `Left`
 *
 * Derivable from `MonadThrow`.
 *
 * @since 2.0.0
 */
export const bracket = <E, A, B>(
  acquire: TaskEither<E, A>,
  use: (a: A) => TaskEither<E, B>,
  release: (a: A, e: Either<E, B>) => TaskEither<E, void>
): TaskEither<E, B> =>
  pipe(
    acquire,
    chain((a) =>
      pipe(
        pipe(use(a), T.map(E.right)),
        chain((e) =>
          pipe(
            release(a, e),
            chain(() => (E.isLeft(e) ? left(e.left) : of(e.right)))
          )
        )
      )
    )
  )

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @since 2.9.0
 */
export const Do: TaskEither<never, {}> = of({})

/**
 * @since 2.8.0
 */
export const bindTo = <N extends string>(name: N): (<E, A>(fa: TaskEither<E, A>) => TaskEither<E, { [K in N]: A }>) =>
  map(bindTo_(name))

/**
 * @since 2.8.0
 */
export const bindW = <N extends string, A, D, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => TaskEither<D, B>
): (<E>(fa: TaskEither<E, A>) => TaskEither<D | E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
  chainW((a) =>
    pipe(
      f(a),
      map((b) => bind_(a, name, b))
    )
  )

/**
 * @since 2.8.0
 */
export const bind: <N extends string, A, E, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => TaskEither<E, B>
) => (fa: TaskEither<E, A>) => TaskEither<E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }> = bindW

// -------------------------------------------------------------------------------------
// pipeable sequence S
// -------------------------------------------------------------------------------------

/**
 * @since 2.8.0
 */
export const apSW = <A, N extends string, D, B>(
  name: Exclude<N, keyof A>,
  fb: TaskEither<D, B>
): (<E>(fa: TaskEither<E, A>) => TaskEither<D | E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
  flow(
    map((a) => (b: B) => bind_(a, name, b)),
    apW(fb)
  )

/**
 * @since 2.8.0
 */
export const apS: <A, N extends string, E, B>(
  name: Exclude<N, keyof A>,
  fb: TaskEither<E, B>
) => (fa: TaskEither<E, A>) => TaskEither<E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }> = apSW

// -------------------------------------------------------------------------------------
// pipeable sequence T
// -------------------------------------------------------------------------------------

/**
 * @since 3.0.0
 */
export const ApT: TaskEither<never, readonly []> = of([])

/**
 * @since 3.0.0
 */
export const tupled: <E, A>(a: TaskEither<E, A>) => TaskEither<E, readonly [A]> = map(tuple)

/**
 * @since 3.0.0
 */
export const apTW = <E2, B>(fb: TaskEither<E2, B>) => <E1, A extends ReadonlyArray<unknown>>(
  fas: TaskEither<E1, A>
): TaskEither<E1 | E2, readonly [...A, B]> =>
  pipe(
    fas,
    map((a) => (b: B): readonly [...A, B] => [...a, b]),
    apW(fb)
  )

/**
 * @since 3.0.0
 */
export const apT: <E, B>(
  fb: TaskEither<E, B>
) => <A extends ReadonlyArray<unknown>>(fas: TaskEither<E, A>) => TaskEither<E, readonly [...A, B]> = apTW

// -------------------------------------------------------------------------------------
// array utils
// -------------------------------------------------------------------------------------

/**
 * @since 2.9.0
 */
export const traverseArrayWithIndex: <A, B, E>(
  f: (index: number, a: A) => TaskEither<E, B>
) => (arr: ReadonlyArray<A>) => TaskEither<E, ReadonlyArray<B>> = (f) => (arr) =>
  pipe(arr, T.traverseArrayWithIndex(f), T.map(E.sequenceArray))

/**
 * this function have the same behavior of `A.traverse(taskEither)` but it's stack safe and perform better
 *
 * *this function run all tasks in parallel and does not bail out, for sequential version use `traverseSeqArray`*
 *
 * @example
 *
 * import * as TE from 'fp-ts/TaskEither'
 * import * as A from 'fp-ts/ReadonlyArray'
 * import { right } from 'fp-ts/Either'
 * import { pipe } from 'fp-ts/function'
 *
 * const PostRepo = {
 *   findById: (id: number) => TE.of({id, title: ''})
 * }
 *
 * const findAllPosts = (ids: ReadonlyArray<number>) => pipe(ids, TE.traverseArray(PostRepo.findById))
 *
 * async function test() {
 *   const ids = A.range(0, 10)
 *
 *   assert.deepStrictEqual(
 *     await findAllPosts(ids)(),
 *     right(
 *       pipe(
 *         ids,
 *         A.map((id) => ({ id, title: ''}))
 *       )
 *     )
 *   )
 * }
 *
 * test()
 *
 * @since 2.9.0
 */
export const traverseArray: <A, B, E>(
  f: (a: A) => TaskEither<E, B>
) => (arr: ReadonlyArray<A>) => TaskEither<E, ReadonlyArray<B>> = (f) => traverseArrayWithIndex((_, a) => f(a))

/**
 * this function have the same behavior of `A.sequence(taskEither)` but it's stack safe and perform better
 *
 * *this function run all tasks in parallel and does not bail out, for sequential version use `sequenceSeqArray`*
 *
 * @example
 *
 * import * as TE from 'fp-ts/TaskEither'
 * import * as A from 'fp-ts/ReadonlyArray'
 * import { right } from 'fp-ts/Either'
 * import { pipe } from 'fp-ts/function'
 *
 * const PostRepo = {
 *   findById: (id: number) => TE.of({id, title: ''})
 * }
 *
 * const findAllPosts = (ids: ReadonlyArray<number>) => pipe(ids, A.map(PostRepo.findById), TE.sequenceArray)
 *
 * async function test() {
 *   const ids = A.range(0, 10)
 *
 *   assert.deepStrictEqual(
 *     await findAllPosts(ids)(),
 *     right(
 *       pipe(
 *         ids,
 *         A.map((id) => ({ id, title: ''}))
 *       )
 *     )
 *   )
 * }
 *
 * test()
 *
 * @since 2.9.0
 */
export const sequenceArray: <A, E>(
  arr: ReadonlyArray<TaskEither<E, A>>
) => TaskEither<E, ReadonlyArray<A>> = traverseArray(identity)

/**
 * @since 2.9.0
 */
export const traverseSeqArrayWithIndex: <A, B, E>(
  f: (index: number, a: A) => TaskEither<E, B>
) => (arr: ReadonlyArray<A>) => TaskEither<E, ReadonlyArray<B>> = (f) => (arr) => async () => {
  // tslint:disable-next-line: readonly-array
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const e = await f(i, arr[i])()
    if (E.isLeft(e)) {
      return e
    }
    out.push(e.right)
  }
  return E.right(out)
}

/**
 * this function have the same behavior of `A.traverse(taskEitherSeq)` but it's stack safe and perform better
 *
 * *this function run all tasks in sequential order and bails out on left side of either, for parallel version use `traverseArray`*
 *
 * @since 2.9.0
 */
export const traverseSeqArray: <A, B, E>(
  f: (a: A) => TaskEither<E, B>
) => (arr: ReadonlyArray<A>) => TaskEither<E, ReadonlyArray<B>> = (f) => traverseSeqArrayWithIndex((_, a) => f(a))

/**
 * this function have the same behavior of `A.sequence(taskEitherSeq)` but it's stack safe and perform better
 *
 * *this function run all tasks in sequential order and bails out on left side of either, for parallel version use `sequenceArray`*
 *
 * @since 2.9.0
 */
export const sequenceSeqArray: <A, E>(
  arr: ReadonlyArray<TaskEither<E, A>>
) => TaskEither<E, ReadonlyArray<A>> = traverseSeqArray(identity)
