import { isUnitTest } from '../shared/isTest';

describe('isTest', () => {
  it('should work', () => {
    expect(isUnitTest()).toBe(true);
  });
});
