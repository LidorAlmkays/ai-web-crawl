import { Kafka, Producer, Consumer } from 'kafkajs';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { WebSocket } from 'ws';
import { Application } from '../../../gateway/src/app';
import config from '../../../gateway/src/config';

describe('Gateway E2E', () => {
  let kafkaContainer: StartedKafkaContainer;
  let producer: Producer;
  let consumer: Consumer;
  let app: Application;
  let ws: WebSocket;

  beforeAll(async () => {
    // Start Kafka container
    kafkaContainer = await new KafkaContainer().start();
    const kafka = new Kafka({
      clientId: 'e2e-test',
      brokers: [kafkaContainer.getBootstrapBrokers()],
    });
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [
        { topic: config.kafka.topics.crawlRequestTopic },
        { topic: config.kafka.topics.crawlResponseTopic },
      ],
    });
    await admin.disconnect();

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'e2e-test-group' });
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: config.kafka.topics.crawlRequestTopic });

    // Set Kafka brokers in config for the app
    process.env.KAFKA_BROKERS = kafkaContainer.getBootstrapBrokers();

    // Start the application
    app = new Application();
    await app.start();
  }, 30000); // 30-second timeout for container startup

  afterAll(async () => {
    await app.stop();
    await producer.disconnect();
    await consumer.disconnect();
    await kafkaContainer.stop();
    if (ws) ws.close();
  });

  it('should process a webscrape request and return the result', (done) => {
    const wsUrl = `ws://localhost:${config.server.websocketPort}`;
    ws = new WebSocket(wsUrl);

    const request = {
      type: 'webscrape',
      data: {
        query: 'e2e test',
        url: 'http://e2e-example.com',
      },
    };

    let requestHash = '';

    // 1. Listen for the response on WebSocket
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.type === 'result') {
        expect(response.data.result).toBe('E2E test result');
        done();
      }
    });

    // 2. Start the Kafka consumer to listen for the published request
    consumer.run({
      eachMessage: async ({ message }) => {
        const crawlRequest = JSON.parse(message.value.toString());
        if (crawlRequest.query === 'e2e test') {
          requestHash = message.key.toString();
          // 3. Once we get the request, publish a mock response
          await producer.send({
            topic: config.kafka.topics.crawlResponseTopic,
            messages: [{ key: requestHash, value: 'E2E test result' }],
          });
        }
      },
    });

    // 4. Send the initial request
    ws.on('open', () => {
      ws.send(JSON.stringify(request));
    });

    ws.on('error', (err) => {
      done(err);
    });
  }, 60000); // Keep long timeout
});
