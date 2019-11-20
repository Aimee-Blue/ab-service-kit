import { Auth } from '@aimee-blue/ab-contracts';
import { callFn } from '../api';
import { currentSelfSignedToken } from './selfSignedTokens';

export async function verifyToken(
  param: Auth.IVerifyParams
): Promise<Auth.IVerifyResult> {
  const authToken = await currentSelfSignedToken();
  return await callFn<Auth.IVerifyResult>('authVerify')(param, {
    authToken,
  });
}
