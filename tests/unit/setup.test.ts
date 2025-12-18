// Basic setup test to verify Jest and fast-check are working

import * as fc from 'fast-check';

describe('Test Setup Verification', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is available and working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number';
      })
    );
  });

  test('TypeScript compilation is working', () => {
    const testObject: { name: string; value: number } = {
      name: 'test',
      value: 42
    };
    
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });
});