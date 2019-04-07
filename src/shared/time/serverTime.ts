import fetch from 'node-fetch';
import { randomBytes } from 'crypto';

function random() {
  return randomBytes(16).toString('hex');
}

export function serverTime() {
  const rnd = random();
  return fetch(`${process.env.TIME_URL!}?rnd=${rnd}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then((arr: [number]) => arr[0]);
}
