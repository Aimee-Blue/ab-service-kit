import * as PubSub from '@google-cloud/pubsub';
import { fromEvent, defer, from, merge } from 'rxjs';
import { switchMap, map, ignoreElements } from 'rxjs/operators';
import { appName } from '../app';
import uuid from 'uuid';

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
        if (!topicExists) {
          await topicPublisher.create();
        }
      }

      const subscription = topicPublisher.subscription(
        subscriptionName,
        subOpts
      );

      if (autoCreateSubscription) {
        const [exists] = await subscription.exists();
        if (!exists) {
          await subscription.create();
        }
      }

      return subscription;
    }),
    switchMap(subscription =>
      merge(
        fromEvent<PubSub.Message>(subscription, 'message'),
        fromEvent<Error>(subscription, 'error').pipe(
          map(err => {
            throw err;
          }),
          ignoreElements()
        )
      )
    )
  );
}
