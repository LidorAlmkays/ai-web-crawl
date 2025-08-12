import { HealthCheckService } from '../health-check.service';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('pg');
jest.mock('kafkajs');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockPool = Pool as jest.MockedClass<typeof Pool>;
const mockKafka = Kafka as jest.MockedClass<typeof Kafka>;

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;
  let mockPoolInstance: jest.Mocked<Pool>;
  let mockKafkaInstance: jest.Mocked<Kafka>;
  let mockClient: any;
  let mockAdmin: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock pool instance
    mockPoolInstance = {
      connect: jest.fn(),
      totalCount: 10,
      idleCount: 5,
    } as any;

    // Mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock admin
    mockAdmin = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      fetchTopicMetadata: jest.fn(),
    };

    // Mock Kafka instance
    mockKafkaInstance = {
      admin: jest.fn().mockReturnValue(mockAdmin),
    } as any;

    // Setup pool mock
    mockPool.mockImplementation(() => mockPoolInstance);

    // Setup Kafka mock
    mockKafka.mockImplementation(() => mockKafkaInstance);

    // Create service instance
    healthCheckService = new HealthCheckService(
      mockPoolInstance,
      mockKafkaInstance
    );
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when database is accessible', async () => {
      // Arrange
      mockPoolInstance.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ health_check: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      // Act
      const result = await healthCheckService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('up');
      expect(result.responseTime).toBeDefined();
      expect(result.details).toEqual({
        connectionPoolSize: 10,
        idleConnections: 5,
        activeConnections: 5,
        tableAccessible: true,
      });
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database health check completed successfully',
        expect.any(Object)
      );
    });

    it('should return unhealthy status when database connection fails', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockPoolInstance.connect.mockRejectedValue(error);

      // Act
      const result = await healthCheckService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('down');
      expect(result.error).toBe('Connection failed');
      expect(result.responseTime).toBeDefined();
      expect(result.details).toEqual({
        connectionPoolSize: 10,
        idleConnections: 5,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.any(Object)
      );
    });

    it('should return unhealthy status when table query fails', async () => {
      // Arrange
      mockPoolInstance.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ health_check: 1 }] })
        .mockRejectedValueOnce(new Error('Table not found'));

      // Act
      const result = await healthCheckService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('down');
      expect(result.error).toBe('Table not found');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('checkKafkaHealth', () => {
    it('should return healthy status when Kafka is accessible', async () => {
      // Arrange
      mockAdmin.connect.mockResolvedValue(undefined);
      mockAdmin.fetchTopicMetadata.mockResolvedValue({
        topics: [{ topic: 'test-topic' }],
        clusterId: 'test-cluster',
        controllerId: 1,
      });
      mockAdmin.disconnect.mockResolvedValue(undefined);

      // Act
      const result = await healthCheckService.checkKafkaHealth();

      // Assert
      expect(result.status).toBe('up');
      expect(result.responseTime).toBeDefined();
      expect(result.details).toEqual({
        topicsCount: 1,
        clusterId: 'test-cluster',
        controllerId: 1,
      });
      expect(mockAdmin.connect).toHaveBeenCalled();
      expect(mockAdmin.disconnect).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Kafka health check completed successfully',
        expect.any(Object)
      );
    });

    it('should return unhealthy status when Kafka connection fails', async () => {
      // Arrange
      const error = new Error('Kafka connection failed');
      mockAdmin.connect.mockRejectedValue(error);

      // Act
      const result = await healthCheckService.checkKafkaHealth();

      // Assert
      expect(result.status).toBe('down');
      expect(result.error).toBe('Kafka connection failed');
      expect(result.responseTime).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Kafka health check failed',
        expect.any(Object)
      );
    });
  });

  describe('checkServiceHealth', () => {
    it('should return healthy status with service metrics', async () => {
      // Arrange
      const mockMemoryUsage = {
        rss: 1024 * 1024 * 100, // 100MB
        heapUsed: 1024 * 1024 * 50, // 50MB
        heapTotal: 1024 * 1024 * 200, // 200MB
        external: 1024 * 1024 * 10, // 10MB
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

      // Act
      const result = await healthCheckService.checkServiceHealth();

      // Assert
      expect(result.status).toBe('up');
      expect(result.responseTime).toBeDefined();
      expect(result.details).toEqual({
        uptime: expect.any(Number),
        memoryUsage: {
          rss: 100,
          heapUsed: 50,
          heapTotal: 200,
          external: 10,
        },
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Service health check completed successfully',
        expect.any(Object)
      );
    });

    it('should return unhealthy status when service check fails', async () => {
      // Arrange
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory check failed');
      });

      // Act
      const result = await healthCheckService.checkServiceHealth();

      // Assert
      expect(result.status).toBe('down');
      expect(result.error).toBe('Memory check failed');
      expect(result.responseTime).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Service health check failed',
        expect.any(Object)
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy status when all components are up', async () => {
      // Arrange
      mockPoolInstance.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ health_check: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      mockAdmin.connect.mockResolvedValue(undefined);
      mockAdmin.fetchTopicMetadata.mockResolvedValue({
        topics: [{ topic: 'test-topic' }],
        clusterId: 'test-cluster',
        controllerId: 1,
      });
      mockAdmin.disconnect.mockResolvedValue(undefined);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 100,
        heapUsed: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 200,
        external: 1024 * 1024 * 10,
      });

      // Act
      const result = await healthCheckService.getSystemHealth();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.kafka.status).toBe('up');
      expect(result.checks.service.status).toBe('up');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'System health check completed',
        expect.any(Object)
      );
    });

    it('should return degraded status when some components are down', async () => {
      // Arrange
      mockPoolInstance.connect.mockRejectedValue(new Error('DB down'));

      mockAdmin.connect.mockResolvedValue(undefined);
      mockAdmin.fetchTopicMetadata.mockResolvedValue({
        topics: [{ topic: 'test-topic' }],
        clusterId: 'test-cluster',
        controllerId: 1,
      });
      mockAdmin.disconnect.mockResolvedValue(undefined);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 100,
        heapUsed: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 200,
        external: 1024 * 1024 * 10,
      });

      // Act
      const result = await healthCheckService.getSystemHealth();

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.kafka.status).toBe('up');
      expect(result.checks.service.status).toBe('up');
    });

    it('should return unhealthy status when all components are down', async () => {
      // Arrange
      mockPoolInstance.connect.mockRejectedValue(new Error('DB down'));
      mockAdmin.connect.mockRejectedValue(new Error('Kafka down'));
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Service down');
      });

      // Act
      const result = await healthCheckService.getSystemHealth();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.kafka.status).toBe('down');
      expect(result.checks.service.status).toBe('down');
    });
  });

  describe('getDetailedHealthChecks', () => {
    it('should return detailed health check results', async () => {
      // Arrange
      mockPoolInstance.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ health_check: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      mockAdmin.connect.mockResolvedValue(undefined);
      mockAdmin.fetchTopicMetadata.mockResolvedValue({
        topics: [{ topic: 'test-topic' }],
        clusterId: 'test-cluster',
        controllerId: 1,
      });
      mockAdmin.disconnect.mockResolvedValue(undefined);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 100,
        heapUsed: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 200,
        external: 1024 * 1024 * 10,
      });

      // Act
      const results = await healthCheckService.getDetailedHealthChecks();

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].component).toBe('database');
      expect(results[1].component).toBe('kafka');
      expect(results[2].component).toBe('service');

      results.forEach((result) => {
        expect(result.timestamp).toBeDefined();
        expect(result.duration).toBeDefined();
        expect(result.check.status).toBeDefined();
      });
    });
  });
});
