import { logLevel as KafkaLogLevel } from 'kafkajs';
import { logger } from './logger';

/**
 * Maps KafkaJS log levels to our custom logger's methods.
 * @param {KafkaLogLevel} level - The log level from KafkaJS.
 * @returns {Function} The corresponding method from our logger.
 */
const toPinoLogLevel = (level: KafkaLogLevel) => {
  switch (level) {
    case KafkaLogLevel.ERROR:
    case KafkaLogLevel.NOTHING:
      return logger.error.bind(logger);
    case KafkaLogLevel.WARN:
      return logger.warn.bind(logger);
    case KafkaLogLevel.INFO:
      return logger.info.bind(logger);
    case KafkaLogLevel.DEBUG:
      return logger.debug.bind(logger);
    default:
      return logger.info.bind(logger);
  }
};

/**
 * A custom log creator for KafkaJS that redirects logs to our Pino logger.
 * This ensures all log output in the application is consistent.
 */
export const pinoLogCreator = (logLevel: KafkaLogLevel) => {
  const pinoLogger = toPinoLogLevel(logLevel);

  return ({ namespace, log }: any) => {
    const { message, ...extra } = log;
    // Correct argument order for Pino: message first, then metadata object.
    pinoLogger(message, {
      kafka_namespace: namespace,
      ...extra,
    });
  };
};
