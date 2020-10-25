import {
  ITopicBoundActionCreator,
  IActionCreator,
  Channels,
  IAnyAction,
} from '@aimee-blue/ab-contracts';
import { appName } from '../app';
import { localNow } from '../time';
import { publish } from './pubsub';
import { uuid } from '../uuid';

export const publishAction = async <C extends ITopicBoundActionCreator>(
  creator: C,
  ...args: Parameters<C>
) => {
  return publishActionToTopics([creator.topic], creator, ...args);
};

export const multicastAction = async <C extends IActionCreator>(
  topics: string[],
  creator: C,
  ...args: Parameters<C>
) => {
  return publishActionToTopics(topics, creator, ...args);
};

const publishActionToTopics = async <
  C extends IActionCreator<IAnyAction, unknown[]>
>(
  topics: string[],
  creator: C,
  ...args: Parameters<C>
) => {
  if (topics.length === 0) {
    throw new Error('Need at least one topic to publish to');
  }

  const app = await appName();

  const messagePrototype: Channels.IPubSubMessageShape<ReturnType<C>> = {
    channel: topics[0],
    senderId: app,
    timestamp: localNow(),
    messageId: uuid(),
    traceId: uuid(),
    ...(creator(...args) as ReturnType<C>),
  };

  await Promise.all(
    topics.map(async (topic) => {
      const message = {
        ...messagePrototype,
        channel: topic,
      };

      await publish(topic, message);

      console.log(
        `Published message of type ${message.type} to topic ${message.channel} with id ${message.messageId} (trace id ${message.traceId}) from ${message.senderId}`
      );
    })
  );

  // messages only differ by channel, so we shouldn't rely on that
  return messagePrototype;
};
