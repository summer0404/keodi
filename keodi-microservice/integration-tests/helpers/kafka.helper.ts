import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';

const BROKER = process.env.KAFKA_BROKER ?? 'localhost:29092';

export function createKafkaClient(clientId: string): Kafka {
  return new Kafka({
    clientId,
    brokers: [BROKER],
    retry: { retries: 3 },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  });
}

export async function createAndConnectProducer(kafka: Kafka): Promise<Producer> {
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function createAndSubscribeConsumer(
  kafka: Kafka,
  groupId: string,
  topic: string,
): Promise<{ consumer: Consumer; messages: KafkaMessage[] }> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();

  // Retry subscribe to tolerate transient leadership election on auto-created topics.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await consumer.subscribe({ topic, fromBeginning: false });
      break;
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  const messages: KafkaMessage[] = [];
  await consumer.run({
    eachMessage: async ({ message }) => {
      messages.push(message);
    },
  });
  // consumer.run() returns immediately but group join + partition assignment is async.
  // Wait for the consumer to be fully ready before returning to the test.
  await new Promise((r) => setTimeout(r, 4000));
  return { consumer, messages };
}

export async function waitForMessages(
  messages: KafkaMessage[],
  count: number,
  timeoutMs = 10000,
): Promise<void> {
  const start = Date.now();
  while (messages.length < count) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timeout: expected ${count} messages but got ${messages.length}`,
      );
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
