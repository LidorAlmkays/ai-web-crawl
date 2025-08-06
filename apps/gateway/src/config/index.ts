import { serverConfig } from './server';
import { kafkaConfig } from './kafka';
import { redisConfig } from './redis';

export interface AppConfig {
  server: typeof serverConfig;
  kafka: typeof kafkaConfig;
  redis: typeof redisConfig;
}

export const config: AppConfig = {
  server: serverConfig,
  kafka: kafkaConfig,
  redis: redisConfig,
};

export default config;
