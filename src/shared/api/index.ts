import fetch, { RequestInit } from 'node-fetch';
import { Errors } from '@aimee-blue/ab-shared';
import { PromiseType } from 'utility-types';

const constructEndpointUri = (rootEndpoint: string, functionName: string) =>
  rootEndpoint + functionName;

export const fetchFn = (
  functionName: string,
  init?: RequestInit | undefined,
  rootEndpoint: string = process.env.CLOUD_FUNCTION_ROOT_ENDPOINT!
) => {
  return fetch(constructEndpointUri(rootEndpoint, functionName), init);
};

/**
 * Call function using Firebase HTTP call conventions
 * @param functionName Name of the function
 * @param authToken Authentication token
 * @param rootEndpoint Functions root endpoint
 */
export const callFn = <T, P = unknown>(
  functionName: string,
  rootEndpoint: string = process.env.CLOUD_FUNCTION_ROOT_ENDPOINT!
) => (data: P, opts: ICallOpts = {}) =>
  fetchFn(
    functionName,
    {
      method: 'post',
      body: JSON.stringify({ data }),
      headers: {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        ...(opts.authToken && { Authorization: 'Bearer ' + opts.authToken }),
      },
      redirect: 'error',
    },
    rootEndpoint
  )
    .then(async res => {
      if (res.ok) {
        return res.json() as Promise<{ result?: T } | T>;
      }

      const message = await Errors.errorMessageFromFetchResponse(res);

      throw new Error(message);
    })
    .then(
      wrapped =>
        ('result' in wrapped && wrapped.result ? wrapped.result : wrapped) as T
    );

interface ICallOpts {
  authToken?: string;
}

type ParametersIf<T> = T extends ((...args: unknown[]) => unknown)
  ? Parameters<T>
  : [never];

type ReturnTypeIf<T> = T extends ((...args: unknown[]) => unknown)
  ? ReturnType<T>
  : never;

type PromiseTypeIf<T> = T extends Promise<unknown> ? PromiseType<T> : never;

export function apiOf<T>(
  rootEndpoint: string = process.env.CLOUD_FUNCTION_ROOT_ENDPOINT!
) {
  return {
    callFn: <K extends keyof T>(
      name: K,
      param: ParametersIf<T[K]>[0],
      opts: ICallOpts = {}
    ) => {
      return callFn<PromiseTypeIf<ReturnTypeIf<T[K]>>>(
        name as string,
        rootEndpoint
      )(param, opts);
    },
  };
}
