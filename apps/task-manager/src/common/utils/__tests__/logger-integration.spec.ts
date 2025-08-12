// Logger integration tests - updated for new architecture
import { LoggerFactory } from '../logging/logger-factory';
import { initializeLogger, logger } from '../logger';

describe('Logger Integration', () => {
  describe('Logger Factory Structure', () => {
    it('should have singleton pattern', () => {
      const factory1 = LoggerFactory.getInstance();
      const factory2 = LoggerFactory.getInstance();
      expect(factory1).toBe(factory2);
    });
  });

  describe('Global Logger', () => {
    it('should have logger functions', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.success).toBe('function');
    });

    it('should have initialization function', () => {
      expect(typeof initializeLogger).toBe('function');
    });
  });
});
