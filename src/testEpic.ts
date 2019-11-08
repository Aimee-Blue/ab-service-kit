import { echoEpic } from './testEpicMod';
import { SocketEpic, IAction } from './shared';
import { map } from 'rxjs/operators';

export function createTestEpic() {
  const epic: SocketEpic<IAction, IAction> = (...args) =>
    echoEpic(...args).pipe(
      //
      map((item, i) => ({ ...item, i: i * 2 }))
    );
  epic.actionSchemaByType = echoEpic.actionSchemaByType;
  return epic;
}
