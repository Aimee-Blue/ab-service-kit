import { Subject } from 'rxjs';
import { IServiceConfig } from './kit';

export interface IStartupParams {
  serviceConfig: IServiceConfig;
}

const startupSubject = new Subject<IStartupParams>();
