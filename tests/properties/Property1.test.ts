// Property test example to verify fast-check setup
// **Feature: ai-dungeon-master, Property 1: Example property for setup verification**

import * as fc from 'fast-check';

describe('Property Test Setup Verification', () => {
  test('Property 1: Addition is commutative', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
      { numRuns: 100 }
    );
  });

  test('Property 2: String concatenation length', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (str1, str2) => {
        const concatenated = str1 + str2;
        return concatenated.length === str1.length + str2.length;
      }),
      { numRuns: 100 }
    );
  });
});