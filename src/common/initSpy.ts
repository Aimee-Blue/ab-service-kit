declare var global: {
  spy: ReturnType<typeof import('rxjs-spy').create> | undefined;
};

function prepareSpy(spy: ReturnType<typeof import('rxjs-spy').create>) {
  console.log('👀  RxJs Spy initialized');
  spy.show();
}

export function initializeRxJsSpy() {
  const { create } = require('rxjs-spy') as {
    create: typeof import('rxjs-spy').create;
  };
  const spy = create();
  prepareSpy(spy);
}

export function teardown() {
  const spy = global.spy;
  if (spy) {
    spy.teardown();
  }
}
