import * as PubSub from '@google-cloud/pubsub';

const pubsubClient = new PubSub.PubSub();

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
  const topicWithOpts = pubsubClient.topic(topic);
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

const getTopic = (topic: string): PubSub.Topic => {
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
    (err: Error | null, mesId: unknown) => {
      if (err) {
        console.error(
          `💥  Error when publishing to topic ${topic} with message ${mesId}`,
          err
        );
      }
    }
  );
}
