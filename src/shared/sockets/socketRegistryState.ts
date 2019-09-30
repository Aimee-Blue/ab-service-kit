import { Socket } from 'net';
import { Subscription } from 'rxjs';
import { SocketWithInfo, MessageWithInfo } from './types';
import { AnySocketEpic } from '../kit';

export type WaitForCompletionFn = () => Promise<'completed' | 'timed-out'>;

export type WatchModeDetachBehavior = 'unsubscribe' | 'disconnect';

export interface IConnectedSocket {
  id: string;
  pathname: string;
  ws: SocketWithInfo;
  socket: Socket;
  request: MessageWithInfo;
  subscription?: Subscription;
  waitForCompletion?: WaitForCompletionFn;
  onDetach: WatchModeDetachBehavior;
}

export interface ISocketRegistryState {
  epicsByPath: Map<string, AnySocketEpic>;
  sockets: Map<string, IConnectedSocket>;
}

const detachFromSocketInWatchMode = (state: ISocketRegistryState) => (
  id: string
) => {
  const socketState = state.sockets.get(id);
  if (!socketState) {
    return;
  }

  const { subscription, waitForCompletion, ...rest } = socketState;

  if (!subscription) {
    return;
  }

  state.sockets.set(id, rest);

  // detachFromSocket should only be called in case if we want to unload
  // previous version of the code from memory
  subscription.unsubscribe();

  if (rest.onDetach === 'disconnect') {
    closeSocketCore(socketState, 1012);
  }
};

const attachToSocket = (state: ISocketRegistryState) => (
  id: string,
  subscription: Subscription,
  waitForCompletion: WaitForCompletionFn,
  onDetach: WatchModeDetachBehavior
) => {
  const socketState = state.sockets.get(id);
  if (!socketState) {
    return;
  }

  state.sockets.set(id, {
    ...socketState,
    subscription,
    waitForCompletion,
    onDetach,
  });
};

const buildTeardown = (state: ISocketRegistryState, id: string) => () => {
  const socketState = state.sockets.get(id);
  if (!socketState) {
    return;
  }

  if (socketState.subscription) {
    socketState.subscription.unsubscribe();
  }
  state.sockets.delete(socketState.id);
};

const waitForCompletionThenTeardown = (
  wait: WaitForCompletionFn,
  teardown: ReturnType<typeof buildTeardown>
) => {
  wait()
    .then(teardown)
    .catch(err => {
      console.error('💥  Error while waiting for epic to complete', err);
      teardown();
    });
};

const clientSideCloseHandler = (
  state: ISocketRegistryState,
  id: string
) => () => {
  const socketState = state.sockets.get(id);
  if (!socketState) {
    return;
  }

  if (socketState.ws.closingByKit) {
    return;
  }

  const teardown = buildTeardown(state, id);

  if (socketState.waitForCompletion) {
    waitForCompletionThenTeardown(socketState.waitForCompletion, teardown);
  } else {
    teardown();
  }
};

const addSocket = (state: ISocketRegistryState) => (
  socketState: IConnectedSocket
) => {
  const oldState = state.sockets.get(socketState.id);
  if (oldState) {
    console.error(
      '💥  Socket with id already exists',
      oldState,
      'will be replaced with',
      socketState
    );
  }

  socketState.ws.on('close', clientSideCloseHandler(state, socketState.id));

  state.sockets.set(socketState.id, socketState);
};

const closeSocketCore = (socketState: IConnectedSocket, code?: number) => {
  socketState.ws.closingByKit = true;
  socketState.ws.close(code);
};

const closeSocket = (state: ISocketRegistryState) => (
  id: string,
  code?: number
) => {
  const socketState = state.sockets.get(id);
  if (!socketState) {
    return;
  }

  closeSocketCore(socketState, code);
};

const waitForAllToComplete = async (all: IConnectedSocket[]) =>
  await all.reduce(
    (previous, state) =>
      previous.then(() =>
        state.waitForCompletion
          ? state.waitForCompletion()
          : Promise.resolve('completed')
      ),
    Promise.resolve()
  );

const onServerClose = (state: ISocketRegistryState) => async () => {
  const all = [...state.sockets.values()];

  // close sockets and possibly start teardown/completion process
  // on the epic handlers:
  for (const socketState of all) {
    closeSocketCore(socketState, 1012);
  }

  // wait for all the epics to complete:
  await waitForAllToComplete(all);

  // cleanup all the data in the state:
  for (const socketState of all) {
    if (socketState.subscription) {
      socketState.subscription.unsubscribe();
    }
    state.sockets.delete(socketState.id);
  }
};

export type RegistryStateApi = ReturnType<typeof buildRegistryStateApi>;

export const buildRegistryStateApi = (state: ISocketRegistryState) => {
  return Object.freeze({
    addSocket: addSocket(state),
    closeSocket: closeSocket(state),
    detachFromSocketInWatchMode: detachFromSocketInWatchMode(state),
    attachToSocket: attachToSocket(state),
    onServerClose: onServerClose(state),
  });
};
