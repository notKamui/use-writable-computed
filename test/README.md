# Test Suite for useWritableComputed

This test suite comprehensively tests the `useWritableComputed` hook with test cases covering:

## Test Categories

### Initial Value Handling

- Static values
- Function-based initial values
- Complex objects

### Dependency Changes

- Recomputation when dependencies change
- Preventing recomputation when dependencies stay the same
- Empty dependency arrays
- Complex dependency arrays

### State Updates

- Direct value updates
- Function-based updates
- Multiple sequential updates
- Object state updates
- Preventing unnecessary re-renders

### Integration Tests

- Interaction between dependency changes and manual updates
- Rapid dependency changes
- State updates during dependency changes

### Edge Cases

- Null and undefined values
- Falsy values (false, 0, '', null, undefined)
- Functions as values (not as updaters)

### Performance Characteristics

- Referential equality of setter across renders
- Consistent setter reference during dependency changes
- setState referential stability across all render types

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch
```

## Test Dependencies

- `@testing-library/react` - React component testing
- `jsdom` - DOM environment for testing
- `bun:test` - Native Bun test runner
