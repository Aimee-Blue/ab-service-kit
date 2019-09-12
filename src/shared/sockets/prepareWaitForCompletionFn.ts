import { Observable } from 'rxjs';
import { defaultIfEmpty } from 'rxjs/operators';
import { whenCompleted } from '../whenCompleted';
import { publishReplayStream } from '../publishStream';

export function prepareWaitForCompletionFn(results: Observable<unknown>) {
  const completed = publishReplayStream(
    results.pipe(
      whenCompleted(),
      defaultIfEmpty('completed')
    ),
    1
  );

  return {
    connect: () => completed.connect(),
    waitForCompletion: async () => {
      await completed.toPromise();
    },
  };
}
