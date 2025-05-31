import {
  type DependencyList,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useReducer,
  useRef,
} from 'react'

type AnyFunction = (...args: never[]) => unknown

function useForceUpdate(): () => void {
  const [, forceUpdate] = useReducer(() => Symbol(), undefined)
  return forceUpdate
}

function useOnMount(callback: () => void): void {
  const hasMounted = useRef(false)
  if (!hasMounted.current) {
    callback()
    hasMounted.current = true
  }
}

function dependenciesChanged(
  previous: DependencyList,
  current: DependencyList,
): boolean {
  if (previous.length !== current.length) {
    return true
  }
  for (let i = 0; i < previous.length; i++) {
    if (!Object.is(previous[i], current[i])) {
      return true
    }
  }
  return false
}

function isFunction<T>(value: T | AnyFunction): value is AnyFunction {
  return typeof value === 'function'
}

function resolveValue<T>(
  value: T | ((previous?: T) => T) | ((previous: T) => T),
  previous?: T,
): T {
  return isFunction(value) ? (value(previous as T) as T) : (value as T)
}
export function useWritableComputed<T>(
  initialValue: T | ((previous?: T) => T) | (() => T),
  dependencies: DependencyList,
): [T, Dispatch<SetStateAction<T>>] {
  let _initialValue: T | null = null
  useOnMount(() => {
    _initialValue = resolveValue(initialValue)
  })

  const state = useRef(_initialValue as T)

  const previousDependencies = useRef(dependencies)
  if (dependenciesChanged(previousDependencies.current, dependencies)) {
    const newState = resolveValue(initialValue, state.current)
    state.current = newState
    previousDependencies.current = dependencies
  }

  const forceUpdate = useForceUpdate()

  const setState = useCallback(
    (newState: T | ((previous: T) => T)): void => {
      const _newState = resolveValue(newState, state.current)
      if (!Object.is(state.current, _newState)) {
        state.current = _newState
        forceUpdate()
      }
    },
    [forceUpdate],
  )

  return [state.current, setState] as const
}
