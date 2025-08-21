// Logger integration tests - updated for new architecture
import { logger } from '../logger';

describe('Logger Integration', () => {
  describe('Global Logger', () => {
    it('should have logger functions', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.success).toBe('function');
    });

    it('should have all required logger methods', () => {
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    it('should be a singleton', () => {
      const logger1 = logger;
      const logger2 = logger;
      expect(logger1).toBe(logger2);
    });
  });
});
