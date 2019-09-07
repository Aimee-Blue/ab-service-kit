export interface IAppFlags {}

const defaultFlags: IAppFlags = {};

import { Config } from '@aimee-blue/ab-shared';

const fromConfig = (config: Config.IConfig) => {
  return {
    ...defaultFlags,
    ...config.featureFlags,
  } as IAppFlags;
};

export const Flags = {
  fromConfig,
};
