import { serverConfig } from './server';
import { kafkaConfig } from './kafka';

export interface AppConfig {
  server: typeof serverConfig;
  kafka: typeof kafkaConfig;
}

export const config: AppConfig = {
  server: serverConfig,
  kafka: kafkaConfig,
};

export default config;
