import { isTest } from '../shared/isTest';

describe('isTest', () => {
  it('should work', () => {
    expect(isTest()).toBe(true);
  });
});
