const WebSocket = require('ws');
const { fromEvent, Observable } = require('rxjs');
const { map, mergeMap, takeUntil } = require('rxjs/operators');
const { streamToRx } = require('rxjs-stream');

const args = process.argv.slice(2);

const socket = new WebSocket(args[0]);

const onOpen = fromEvent(socket, 'open');
const onClose = fromEvent(socket, 'close');
const onError = fromEvent(socket, 'error').pipe(
  mergeMap(event => {
    return Promise.reject(event.error);
  })
);
const onMessage = fromEvent(socket, 'message').pipe(map(event => event.data));

const onData = streamToRx(process.stdin).pipe(
  takeUntil(onClose),
  map(data => data.toString('utf-8')),
  mergeMap(text => text.split('\n').filter(item => !!item))
);

const sendOnData = onData.pipe(
  mergeMap(data => {
    return new Promise((res, rej) => {
      socket.send(data, err => {
        if (err) {
          rej(err);
        } else {
          res(data);
        }
      });
    });
  })
);

new Observable(subscriber => {
  subscriber.add(
    sendOnData.subscribe({
      next: data => {
        console.log('');
        console.log('✉️  ', data);
        console.log('');
      },
      error: err => {
        console.error('💥  ', err);
      },
    })
  );
  subscriber.add(
    onMessage.subscribe({
      next: data => {
        console.log('');
        console.log('📩  ', data);
        console.log('');
      },
      error: err => {
        console.error('💥  ', err);
      },
      complete: () => {
        console.log('✅  Done');
      },
    })
  );
})
  .pipe(takeUntil(onClose))
  .subscribe({
    complete: () => {
      socket.terminate();
      process.exit(0);
    },
  });
