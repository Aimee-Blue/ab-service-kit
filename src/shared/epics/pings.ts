import { SocketEpic, ofType, localNow } from '..';
import { Apps } from '@aimee-blue/ab-shared';
import { map } from 'rxjs/operators';

export const pingsEpic: SocketEpic<Apps.IPingAction, Apps.IPongAction> = cmd =>
  cmd.pipe(
    ofType<Apps.IPingAction>(Apps.PING),
    map(act =>
      Apps.pong({
        id: act.payload.id,
        timestamp: localNow(),
      })
    )
  );
