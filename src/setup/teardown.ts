export type TeardownMode = 'destroy' | 'watch-mode';

export type TeardownHandler = (mode: TeardownMode) => Promise<void>;

export const noop: TeardownHandler = async () => {
  return;
};
