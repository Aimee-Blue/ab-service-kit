import { VerifyError } from '../verifyError';

describe(VerifyError.name, () => {
  it('should inherit Error', () => {
    expect(new VerifyError('') instanceof Error).toBe(true);
  });

  it('should inherit VerifyError', () => {
    expect(new VerifyError('') instanceof VerifyError).toBe(true);
  });

  it('should have token', () => {
    expect(
      new VerifyError('', {
        header: {},
        payload: {},
        signature: '',
      })
    ).toHaveProperty('token');
  });
});
