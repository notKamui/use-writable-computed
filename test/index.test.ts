import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import { useWritableComputed } from '../index'

const dom = new JSDOM()
// biome-ignore lint/suspicious/noExplicitAny:
globalThis.window = dom.window as any
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Element = dom.window.Element

describe('useWritableComputed', () => {
  beforeEach(() => {
    mock.restore()
  })

  describe('initial value handling', () => {
    test('should initialize with a static value', () => {
      const { result } = renderHook(() => useWritableComputed(42, []))

      expect(result.current[0]).toBe(42)
    })

    test('should initialize with a function that returns a value', () => {
      const initialValueFn = mock(() => 'computed initial')
      const { result } = renderHook(() =>
        useWritableComputed(initialValueFn, []),
      )

      expect(result.current[0]).toBe('computed initial')
      expect(initialValueFn).toHaveBeenCalledTimes(1)
      expect(initialValueFn).toHaveBeenCalledWith(undefined)
    })

    test('should initialize with a complex object', () => {
      const initialValue = { count: 0, name: 'test' }
      const { result } = renderHook(() => useWritableComputed(initialValue, []))

      expect(result.current[0]).toEqual(initialValue)
    })
  })

  describe('dependency changes', () => {
    test('should recompute when dependencies change', () => {
      const computeFn = mock((prev?: number) => (prev || 0) + 1)
      let dep = 1

      const { result, rerender } = renderHook(() =>
        useWritableComputed(computeFn, [dep]),
      )

      expect(result.current[0]).toBe(1)
      expect(computeFn).toHaveBeenCalledTimes(1)

      dep = 2
      rerender()

      expect(result.current[0]).toBe(2)
      expect(computeFn).toHaveBeenCalledTimes(2)
      expect(computeFn).toHaveBeenLastCalledWith(1)
    })

    test('should not recompute when dependencies stay the same', () => {
      const computeFn = mock(() => Math.random())
      const deps = [1, 'test', true]

      const { result, rerender } = renderHook(() =>
        useWritableComputed(computeFn, deps),
      )

      const firstValue = result.current[0]
      expect(computeFn).toHaveBeenCalledTimes(1)

      // Rerender with same dependencies
      rerender()

      expect(result.current[0]).toBe(firstValue)
      expect(computeFn).toHaveBeenCalledTimes(1) // Should not be called again
    })

    test('should handle empty dependencies array', () => {
      const computeFn = mock(() => 'constant')

      const { result, rerender } = renderHook(() =>
        useWritableComputed(computeFn, []),
      )

      expect(result.current[0]).toBe('constant')
      expect(computeFn).toHaveBeenCalledTimes(1)

      rerender()

      expect(result.current[0]).toBe('constant')
      expect(computeFn).toHaveBeenCalledTimes(1) // Should not recompute
    })

    test('should detect dependency changes', () => {
      const computeFn = mock((prev?: string) => `computed-${Math.random()}`)

      const { result, rerender } = renderHook(
        ({ value }) => useWritableComputed(computeFn, [value]),
        { initialProps: { value: 1 } },
      )

      const firstValue = result.current[0]
      expect(computeFn).toHaveBeenCalledTimes(1)

      // Change the dependency value to trigger recomputation
      rerender({ value: 2 })

      expect(result.current[0]).not.toBe(firstValue)
      expect(computeFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('state updates', () => {
    test('should update state with a new value', () => {
      const { result } = renderHook(() => useWritableComputed(0, []))

      act(() => {
        result.current[1](42)
      })

      expect(result.current[0]).toBe(42)
    })

    test('should update state with a function', () => {
      const { result } = renderHook(() => useWritableComputed(10, []))

      act(() => {
        result.current[1]((prev) => prev * 2)
      })

      expect(result.current[0]).toBe(20)
    })

    test('should update state multiple times', () => {
      const { result } = renderHook(() => useWritableComputed(0, []))

      act(() => {
        result.current[1](1)
      })
      expect(result.current[0]).toBe(1)

      act(() => {
        result.current[1]((prev) => prev + 5)
      })
      expect(result.current[0]).toBe(6)

      act(() => {
        result.current[1](100)
      })
      expect(result.current[0]).toBe(100)
    })

    test('should handle object state updates', () => {
      const initialState = { count: 0, name: 'test' }
      const { result } = renderHook(() => useWritableComputed(initialState, []))

      act(() => {
        result.current[1]((prev) => ({ ...prev, count: prev.count + 1 }))
      })

      expect(result.current[0]).toEqual({ count: 1, name: 'test' })
    })

    test('should not trigger re-render when setting the same value', () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useWritableComputed(42, [])
      })

      const initialRenderCount = renderCount

      act(() => {
        result.current[1](42) // Same value
      })

      expect(result.current[0]).toBe(42)
      expect(renderCount).toBe(initialRenderCount) // No additional render
    })

    test('should not trigger re-render when function returns the same value', () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useWritableComputed(42, [])
      })

      const initialRenderCount = renderCount

      act(() => {
        result.current[1]((prev) => prev) // Returns same value
      })

      expect(result.current[0]).toBe(42)
      expect(renderCount).toBe(initialRenderCount) // No additional render
    })
  })

  describe('interaction between dependencies and manual updates', () => {
    test('should preserve manual updates when dependencies change', () => {
      const computeFn = mock((prev?: number) => (prev || 0) + 10)
      let dep = 1

      const { result, rerender } = renderHook(() =>
        useWritableComputed(computeFn, [dep]),
      )

      expect(result.current[0]).toBe(10)

      // Manual update
      act(() => {
        result.current[1](100)
      })
      expect(result.current[0]).toBe(100)

      // Dependency change should recompute from the current state
      dep = 2
      rerender()

      expect(result.current[0]).toBe(110) // 100 + 10
      expect(computeFn).toHaveBeenLastCalledWith(100)
    })

    test('should handle rapid dependency changes', () => {
      const computeFn = mock((prev?: number) => (prev || 0) + 1)
      let dep = 1

      const { result, rerender } = renderHook(() =>
        useWritableComputed(computeFn, [dep]),
      )

      expect(result.current[0]).toBe(1)

      // Multiple rapid dependency changes
      dep = 2
      rerender()
      dep = 3
      rerender()
      dep = 4
      rerender()

      expect(result.current[0]).toBe(4)
      expect(computeFn).toHaveBeenCalledTimes(4)
    })
  })

  describe('edge cases', () => {
    test('should handle null and undefined values', () => {
      const { result: nullResult } = renderHook(() =>
        useWritableComputed(null, []),
      )
      expect(nullResult.current[0]).toBe(null)

      const { result: undefinedResult } = renderHook(() =>
        useWritableComputed(undefined, []),
      )
      expect(undefinedResult.current[0]).toBe(undefined)
    })

    test('should handle falsy values correctly', () => {
      const { result: boolResult } = renderHook(() =>
        useWritableComputed(false, []),
      )
      expect(boolResult.current[0]).toBe(false)

      const { result: numberResult } = renderHook(() =>
        useWritableComputed(0, []),
      )
      expect(numberResult.current[0]).toBe(0)

      const { result: stringResult } = renderHook(() =>
        useWritableComputed('', []),
      )
      expect(stringResult.current[0]).toBe('')

      const { result: nullResult } = renderHook(() =>
        useWritableComputed(null, []),
      )
      expect(nullResult.current[0]).toBe(null)

      const { result: undefinedResult } = renderHook(() =>
        useWritableComputed(undefined, []),
      )
      expect(undefinedResult.current[0]).toBe(undefined)
    })

    test('should handle functions as values', () => {
      const functionValue = () => 'I am a value'
      const { result } = renderHook(() =>
        useWritableComputed(() => functionValue, []),
      )

      expect(typeof result.current[0]).toBe('function')
      const fn = result.current[0] as () => string
      expect(fn()).toBe('I am a value')
    })

    test('should work with complex dependency arrays', () => {
      const symbol = Symbol('test')
      const obj = { nested: 'object' }
      const deps = [1, 'string', true, null, undefined, symbol, obj]
      const computeFn = mock(() => 'computed')

      const { result } = renderHook(() => useWritableComputed(computeFn, deps))

      expect(result.current[0]).toBe('computed')
      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    test('should handle state updates during dependency changes', () => {
      const computeFn = mock((prev?: number) => (prev || 0) + 1)
      let dep = 1

      const { result, rerender } = renderHook(() =>
        useWritableComputed(computeFn, [dep]),
      )

      expect(result.current[0]).toBe(1)

      // Simulate simultaneous dependency change and state update
      act(() => {
        result.current[1](50)
        dep = 2
        rerender()
      })

      // The dependency change should recompute from the updated state
      expect(result.current[0]).toBe(51) // 50 + 1
    })
  })

  describe('performance characteristics', () => {
    test('should maintain referential equality of setter across renders', () => {
      let dep = 1
      const { result, rerender } = renderHook(() =>
        useWritableComputed(0, [dep]),
      )

      const firstSetter = result.current[1]

      dep = 2
      rerender()

      const secondSetter = result.current[1]

      expect(firstSetter).toBe(secondSetter) // Same reference
    })

    test('should not create new setter on every render when dependencies change', () => {
      const setters = new Set()
      let dep = 1

      const { result, rerender } = renderHook(() => {
        const [value, setter] = useWritableComputed(0, [dep])
        setters.add(setter)
        return [value, setter]
      })

      // Change dependencies multiple times
      for (let i = 2; i <= 5; i++) {
        dep = i
        rerender()
      }

      // Should have only one unique setter
      expect(setters.size).toBe(1)
    })

    test('should keep setState referentially stable across all types of renders', () => {
      type SetterFunction = (value: number | ((prev: number) => number)) => void
      const setters: SetterFunction[] = []
      let renderCount = 0

      const { result, rerender } = renderHook((): [number, SetterFunction] => {
        renderCount++
        const [value, setter] = useWritableComputed(renderCount, [])
        setters.push(setter)
        return [value, setter]
      })

      const originalSetter = result.current[1]

      // Test multiple rerenders without any changes
      rerender()
      rerender()
      rerender()

      // Test rerender after state update
      act(() => {
        result.current[1](100)
      })
      rerender()

      // Test rerender after multiple state updates
      act(() => {
        result.current[1]((prev: number) => prev + 1)
        result.current[1]((prev: number) => prev + 1)
      })
      rerender()

      // All setters should be the exact same reference
      setters.forEach((setter: SetterFunction) => {
        expect(setter).toBe(originalSetter)
      })

      // Verify we collected multiple setters for a thorough test
      expect(setters.length).toBeGreaterThan(5)
      expect(renderCount).toBeGreaterThan(5)
    })
  })
})
