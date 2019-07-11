import { setupSockets } from '../setup/sockets';
import { EventEmitter } from 'events';

function mockServer() {
  const server = new EventEmitter();
  return server;
}

function prepareTestArgsAndMocks() {
  const registry = {
    initialize: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    registry,
    server: mockServer(),
    config: {
      shouldUseDefaultEndpoints: false,
    },
    deps: {
      getRegistry: jest.fn(() => registry),
    },
  };
}

describe('setupSockets', () => {
  it('should initialize registry', async () => {
    const data = prepareTestArgsAndMocks();
    await setupSockets(data.server, data.config, data.deps);

    expect(data.deps.getRegistry).toBeCalledTimes(1);
    expect(data.deps.getRegistry.mock.calls[0][0]).toBe(data.server);
    expect(data.deps.getRegistry.mock.calls[0][1]).toEqual(new Map());
    expect(data.registry.initialize).toBeCalledTimes(1);
  });

  it('should dispose correctly', async () => {
    const data = prepareTestArgsAndMocks();
    const result = await setupSockets(data.server, data.config, data.deps);

    await result('destroy');

    expect(data.registry.destroy).toBeCalledTimes(1);
  });
});
