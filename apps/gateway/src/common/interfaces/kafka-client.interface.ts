import { Consumer, Producer } from 'kafkajs';

export interface IKafkaClientService {
  getProducer(): Producer;
  getConsumer(groupId?: string): Consumer;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
