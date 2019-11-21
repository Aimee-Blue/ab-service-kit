import { decodeJwt } from '@aimee-blue/ab-auth';

export class VerifyError extends Error {
  constructor(message: string, readonly token?: ReturnType<typeof decodeJwt>) {
    super(message);
    this.name = `VerifyError`;
  }
}
