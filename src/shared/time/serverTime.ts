import fetch from 'node-fetch';
import { randomBytes } from 'crypto';
import { Errors } from '@aimee-blue/ab-shared';

function random() {
  return randomBytes(16).toString('hex');
}

export function serverTime() {
  const rnd = random();
  return fetch(`${process.env.TIME_URL!}?rnd=${rnd}`)
    .then(async response => {
      if (!response.ok) {
        const message = await Errors.errorMessageFromFetchResponse(response);
        throw new Error(message);
      }

      return response.json();
    })
    .then((arr: [number]) => arr[0]);
}
