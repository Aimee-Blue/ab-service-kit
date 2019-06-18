import * as PubSub from '@google-cloud/pubsub';
import { fromEvent, defer, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { appName } from '../app';
import uuid from 'uuid';
import { AckQueue } from '@google-cloud/pubsub/build/src/message-queues';
import { localNow } from '../time';

let initializedClient: PubSub.PubSub | null = null;

export const pubsubClient = () => {
  return initializedClient || (initializedClient = new PubSub.PubSub());
};

const topicMap = new Map<string, PubSub.Topic>();

const retrySettings = {
  retryCodes: [
    10, // 'ABORTED'
    1, // 'CANCELLED',
    4, // 'DEADLINE_EXCEEDED'
    13, // 'INTERNAL'
    8, // 'RESOURCE_EXHAUSTED'
    14, // 'UNAVAILABLE'
    2, // 'UNKNOWN'
  ],
  backoffSettings: {
    initialRetryDelayMillis: 5,
    retryDelayMultiplier: 2,
    maxRetryDelayMillis: 60000,
    initialRpcTimeoutMillis: 10000,
    rpcTimeoutMultiplier: 1.0,
    maxRpcTimeoutMillis: 10000,
    totalTimeoutMillis: 10000,
  },
};

const addTopicToMap = (topic: string) => {
  const topicWithOpts = pubsubClient().topic(topic);

  topicWithOpts.setPublishOptions({
    batching: {
      maxMessages: 1,
      maxMilliseconds: 1,
      maxBytes: 1,
    },
    gaxOpts: {
      retry: retrySettings,
    },
  });

  topicMap.set(topic, topicWithOpts);

  return topicMap.get(topic) as PubSub.Topic;
};

export const getTopic = (topic: string): PubSub.Topic => {
  const topicPublisher = topicMap.has(topic)
    ? topicMap.get(topic)
    : addTopicToMap(topic);

  if (!topicPublisher) {
    return addTopicToMap(topic);
  }

  return topicPublisher;
};

export async function prepareTopics(topics: string[]) {
  topics.forEach(topic => {
    addTopicToMap(topic);
  });
}

export async function publish<T>(topic: string, data: T) {
  const topicPublisher = getTopic(topic);

  topicPublisher.publish(
    Buffer.from(JSON.stringify(data), 'utf8'),
    (err: Error | null, mesId) => {
      if (err) {
        console.error(
          `💥  Error when publishing to topic ${topic} ${
            mesId ? `with message ${mesId}` : ''
          }`,
          err
        );
      }
    }
  );
}

export function subscribe(
  topic: string,
  options?: PubSub.SubscriptionOptions & {
    autoCreateTopic?: boolean;
    subscriptionName?: string;
    autoCreateSubscription?: boolean;
  }
) {
  return defer(() => from(appName())).pipe(
    switchMap(async fullName => {
      const start = localNow();

      const shortName = fullName.replace('@aimee-blue/', '');

      const {
        autoCreateTopic,
        subscriptionName,
        autoCreateSubscription,
        ...subOpts
      } = {
        autoCreateTopic: true,
        subscriptionName: `${shortName}-${uuid()}`,
        autoCreateSubscription: true,
        ...options,
      };

      const topicPublisher = getTopic(topic);

      if (autoCreateTopic) {
        const [topicExists] = await topicPublisher.exists();

        console.log('topic exists', topicExists, localNow() - start);

        if (!topicExists) {
          await topicPublisher.create();

          console.log('topic created', localNow() - start);
        }
      }

      const subscription = topicPublisher.subscription(
        subscriptionName,
        subOpts
      );

      if (autoCreateSubscription) {
        const [exists] = await subscription.exists();

        console.log('subscription exists', exists, localNow() - start);

        if (!exists) {
          await subscription.create();

          console.log('subscription created', localNow() - start);
        }
      }

      const stop = localNow();

      console.log('Creating topic and subscription took: ', stop - start);

      return subscription;
    }),
    switchMap(subscription => {
      return fromEvent<PubSub.Message>(subscription, 'message');
    })
  );
}
