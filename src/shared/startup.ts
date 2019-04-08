import { startup } from '../setup/startup';

export const onStartup = () => startup.asObservable();
