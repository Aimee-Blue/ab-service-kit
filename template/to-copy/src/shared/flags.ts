import { Config } from '@aimee-blue/ab-contracts';

export interface IAppFlags {}

const defaultFlags: IAppFlags = {};

const fromConfig = (config: Config.IConfig) => {
  const appFlags: IAppFlags = {
    ...defaultFlags,
    ...config.featureFlags,
  };
  return appFlags;
};

export const Flags = {
  fromConfig,
};
