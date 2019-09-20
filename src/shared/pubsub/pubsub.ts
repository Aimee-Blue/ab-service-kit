import * as PubSub from '@google-cloud/pubsub';
import { fromEvent, defer, from, merge, Observable } from 'rxjs';
import { switchMap, map, ignoreElements } from 'rxjs/operators';
import { appName } from '../app';
import uuid from 'uuid';
import { EOL } from 'os';
import { isDevBuild } from '../isTest';

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

export type Message = PubSub.Message;

type SubscribeOptions = PubSub.SubscriptionOptions & {
  autoCreateTopic?: boolean;
  subscriptionName?: string;
  autoCreateSubscription?: boolean;
  autoDeleteSubscription?: boolean;
  subscriptionOptions?: PubSub.CreateSubscriptionOptions;
};

const subscriptionNamesByTopic = new Map<string, string>();

async function createTopicAndSubscription(
  topic: string,
  fullName: string,
  options?: SubscribeOptions
) {
  const shortName = fullName.replace('@aimee-blue/', '');

  const genName = isDevBuild()
    ? `${shortName}-${process.env.USER}`
    : `${shortName}-${uuid()}`;

  const lastName = subscriptionNamesByTopic.get(topic);

  const {
    autoCreateTopic,
    subscriptionName,
    autoCreateSubscription,
    subscriptionOptions,
    ...subOpts
  } = {
    autoCreateTopic: true,
    subscriptionName: lastName || genName,
    autoCreateSubscription: true,
    subscriptionOptions: undefined,
    ...options,
  };

  const topicPublisher = getTopic(topic);

  if (autoCreateTopic && !lastName) {
    const [topicExists] = await topicPublisher.exists();
    if (!topicExists) {
      await topicPublisher.create();
    }
  }

  const subscription = topicPublisher.subscription(subscriptionName, subOpts);

  if (autoCreateSubscription && !lastName) {
    const [exists] = await subscription.exists();
    if (!exists) {
      await subscription.create(subscriptionOptions);
    }
  }

  // if success, then remember:
  if (!subscriptionNamesByTopic.get(topic)) {
    subscriptionNamesByTopic.set(topic, subscriptionName);
  }

  return subscription;
}

export function subscribe(topic: string, options?: SubscribeOptions) {
  return defer(() => from(appName())).pipe(
    switchMap(name => createTopicAndSubscription(topic, name, options)),
    switchMap(
      subscription =>
        new Observable<Message>(subscriber => {
          const name = subscription.name;

          console.log(
            `${EOL}🎬  Subscribing to topic "${topic}" with subscription "${name}"`,
            EOL
          );

          subscriber.add(
            merge(
              fromEvent<PubSub.Message>(subscription, 'message'),
              fromEvent<Error>(subscription, 'error').pipe(
                map(err => {
                  throw err;
                }),
                ignoreElements()
              )
            ).subscribe(subscriber)
          );
          subscriber.add(() => {
            subscription
              .close()
              .then(() => {
                console.log(
                  `${EOL}🏁  Unsubscribed from "${subscription.name}"`,
                  EOL
                );
              })
              .catch((err: Error) => {
                console.error(
                  `${EOL}💥  Error when unsubscribing from "${subscription.name}"`,
                  err,
                  EOL
                );
              });
          });
        })
    )
  );
}
