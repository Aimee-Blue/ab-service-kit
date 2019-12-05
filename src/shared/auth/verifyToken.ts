import { Auth } from '@aimee-blue/ab-contracts';
import { minimallyValidateJwt } from '@aimee-blue/ab-auth';
import { callFn } from '../api';
import { currentSelfSignedToken } from './selfSignedTokens';

export async function verifyToken(
  param: Auth.IVerifyParams
): Promise<Auth.IVerifyResult> {
  await minimallyValidateJwt(param.token);
  const authToken = await currentSelfSignedToken();
  return await callFn<Auth.IVerifyResult>('authVerify')(param, {
    authToken,
  });
}
