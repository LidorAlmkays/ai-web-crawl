import { LoggerLevel, LoggerLevelType } from '../logger-level.enum';

describe('LoggerLevel Enum', () => {
  it('should have all required log levels', () => {
    expect(LoggerLevel.INFO).toBe('info');
    expect(LoggerLevel.WARN).toBe('warn');
    expect(LoggerLevel.ERROR).toBe('error');
    expect(LoggerLevel.DEBUG).toBe('debug');
    expect(LoggerLevel.SUCCESS).toBe('success');
  });

  it('should have correct number of levels', () => {
    const levels = Object.values(LoggerLevel);
    expect(levels).toHaveLength(5);
  });

  it('should have unique values', () => {
    const levels = Object.values(LoggerLevel);
    const uniqueLevels = new Set(levels);
    expect(uniqueLevels.size).toBe(levels.length);
  });

  it('should maintain backward compatibility with LoggerLevelType', () => {
    const levels: LoggerLevelType[] = [LoggerLevel.INFO, LoggerLevel.WARN, LoggerLevel.ERROR, LoggerLevel.DEBUG, LoggerLevel.SUCCESS];

    expect(levels).toHaveLength(5);
    expect(levels.every((level) => typeof level === 'string')).toBe(true);
  });

  it('should work with string comparison', () => {
    expect(LoggerLevel.INFO === 'info').toBe(true);
    expect(LoggerLevel.WARN === 'warn').toBe(true);
    expect(LoggerLevel.ERROR === 'error').toBe(true);
    expect(LoggerLevel.DEBUG === 'debug').toBe(true);
    expect(LoggerLevel.SUCCESS === 'success').toBe(true);
  });

  it('should work with switch statements', () => {
    const testSwitch = (level: LoggerLevel): string => {
      switch (level) {
        case LoggerLevel.INFO:
          return 'information';
        case LoggerLevel.WARN:
          return 'warning';
        case LoggerLevel.ERROR:
          return 'error';
        case LoggerLevel.DEBUG:
          return 'debug';
        case LoggerLevel.SUCCESS:
          return 'success';
        default:
          return 'unknown';
      }
    };

    expect(testSwitch(LoggerLevel.INFO)).toBe('information');
    expect(testSwitch(LoggerLevel.WARN)).toBe('warning');
    expect(testSwitch(LoggerLevel.ERROR)).toBe('error');
    expect(testSwitch(LoggerLevel.DEBUG)).toBe('debug');
    expect(testSwitch(LoggerLevel.SUCCESS)).toBe('success');
  });

  it('should work with array methods', () => {
    const levels = Object.values(LoggerLevel);

    expect(levels.includes(LoggerLevel.INFO)).toBe(true);
    expect(levels.includes(LoggerLevel.WARN)).toBe(true);
    expect(levels.includes(LoggerLevel.ERROR)).toBe(true);
    expect(levels.includes(LoggerLevel.DEBUG)).toBe(true);
    expect(levels.includes(LoggerLevel.SUCCESS)).toBe(true);
  });

  it('should work with object keys', () => {
    const levelKeys = Object.keys(LoggerLevel);
    expect(levelKeys).toContain('INFO');
    expect(levelKeys).toContain('WARN');
    expect(levelKeys).toContain('ERROR');
    expect(levelKeys).toContain('DEBUG');
    expect(levelKeys).toContain('SUCCESS');
  });
});
