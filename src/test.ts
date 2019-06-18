import { start } from './start';
import config from './config';
import { PubSub } from './shared';
import { tap } from 'rxjs/operators';

start(config)
  .then(() => {
    PubSub.subscribe('JOB_AVAILABLE', {
      subscriptionName: 'JOB_AVAILABLE',
    })
      .pipe(
        tap(msg => {
          console.log(
            msg.data,
            msg.received,
            msg.publishTime.valueOf(),
            msg.received - msg.publishTime.valueOf()
          );
          msg.ack();
        })
      )
      .subscribe();
  })
  .catch((exc: unknown) => {
    console.error('💥  ', exc);
    process.exit(1);
  });
