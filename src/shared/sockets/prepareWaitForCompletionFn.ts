import { Observable, of } from 'rxjs';
import { defaultIfEmpty, timeoutWith } from 'rxjs/operators';
import { whenCompleted } from '../whenCompleted';
import { publishReplayStream } from '../publishStream';

export function prepareWaitForCompletionFn(
  results: Observable<unknown>,
  timeout: number
) {
  const completedOrTimedOut = publishReplayStream(
    results.pipe(
      whenCompleted(),
      defaultIfEmpty('completed' as const)
    ),
    1
  );

  return {
    connect: () => completedOrTimedOut.connect(),
    waitForCompletion: async () => {
      return await completedOrTimedOut
        .pipe(timeoutWith(timeout, of('timed-out' as const)))
        .toPromise();
    },
  };
}
