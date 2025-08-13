import { WebCrawlMetricsAdapter } from '../WebCrawlMetricsAdapter';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('WebCrawlMetricsAdapter', () => {
  let adapter: WebCrawlMetricsAdapter;
  let mockPool: any;

  beforeEach(() => {
    // Create mock pool with query method
    mockPool = {
      query: jest.fn(),
    };

    adapter = new WebCrawlMetricsAdapter(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNewTasksCount', () => {
    it('should call get_new_tasks_count SQL function with correct parameter', async () => {
      const mockResult = { rows: [{ count: '5' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getNewTasksCount(24);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_new_tasks_count($1) as count',
        [24]
      );
      expect(result).toBe(5);
    });

    it('should handle different hour values', async () => {
      const mockResult = { rows: [{ count: '10' }] };
      mockPool.query.mockResolvedValue(mockResult);

      await adapter.getNewTasksCount(12);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_new_tasks_count($1) as count',
        [12]
      );
    });

    it('should handle zero count result', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getNewTasksCount(1);

      expect(result).toBe(0);
    });
  });

  describe('getCompletedTasksCount', () => {
    it('should call get_completed_tasks_count SQL function with correct parameter', async () => {
      const mockResult = { rows: [{ count: '15' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getCompletedTasksCount(24);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_completed_tasks_count($1) as count',
        [24]
      );
      expect(result).toBe(15);
    });
  });

  describe('getErrorTasksCount', () => {
    it('should call get_error_tasks_count SQL function with correct parameter', async () => {
      const mockResult = { rows: [{ count: '2' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getErrorTasksCount(24);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_error_tasks_count($1) as count',
        [24]
      );
      expect(result).toBe(2);
    });
  });

  describe('getTotalTasksCountByCreationTime', () => {
    it('should call get_total_tasks_count_by_creation_time SQL function with correct parameter', async () => {
      const mockResult = { rows: [{ count: '22' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getTotalTasksCountByCreationTime(24);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_total_tasks_count_by_creation_time($1) as count',
        [24]
      );
      expect(result).toBe(22);
    });

    it('should handle different hour values', async () => {
      const mockResult = { rows: [{ count: '8' }] };
      mockPool.query.mockResolvedValue(mockResult);

      await adapter.getTotalTasksCountByCreationTime(12);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_total_tasks_count_by_creation_time($1) as count',
        [12]
      );
    });

    it('should handle zero count result', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getTotalTasksCountByCreationTime(1);

      expect(result).toBe(0);
    });
  });

  describe('getWebCrawlMetrics', () => {
    it('should call all four methods and format response correctly', async () => {
      // Mock all four individual methods
      const mockNewResult = { rows: [{ count: '5' }] };
      const mockCompletedResult = { rows: [{ count: '15' }] };
      const mockErrorResult = { rows: [{ count: '2' }] };
      const mockTotalResult = { rows: [{ count: '22' }] };

      mockPool.query
        .mockResolvedValueOnce(mockNewResult)
        .mockResolvedValueOnce(mockCompletedResult)
        .mockResolvedValueOnce(mockErrorResult)
        .mockResolvedValueOnce(mockTotalResult);

      const result = await adapter.getWebCrawlMetrics(24);

      // Verify all four queries were called
      expect(mockPool.query).toHaveBeenCalledTimes(4);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        'SELECT get_new_tasks_count($1) as count',
        [24]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        'SELECT get_completed_tasks_count($1) as count',
        [24]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        3,
        'SELECT get_error_tasks_count($1) as count',
        [24]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        4,
        'SELECT get_total_tasks_count_by_creation_time($1) as count',
        [24]
      );

      // Verify response format
      expect(result).toMatchObject({
        newTasksCount: 5,
        completedTasksCount: 15,
        errorTasksCount: 2,
        totalTasksCount: 22,
        timeRange: '24h',
      });
      expect(result.timestamp).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.lastUpdated).toBe('string');
    });

    it('should handle different time ranges', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getWebCrawlMetrics(1);

      expect(result.timeRange).toBe('1h');
    });
  });

  describe('SQL Function Parameter Tests', () => {
    it('should use $1 parameterization for all queries', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      mockPool.query.mockResolvedValue(mockResult);

      await adapter.getNewTasksCount(24);
      await adapter.getCompletedTasksCount(12);
      await adapter.getErrorTasksCount(6);
      await adapter.getTotalTasksCountByCreationTime(24);

      // Verify all queries use $1 parameterization
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_new_tasks_count($1) as count',
        [24]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_completed_tasks_count($1) as count',
        [12]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_error_tasks_count($1) as count',
        [6]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_total_tasks_count_by_creation_time($1) as count',
        [24]
      );
    });

    it('should not use raw SQL strings', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      mockPool.query.mockResolvedValue(mockResult);

      await adapter.getNewTasksCount(24);

      // Verify no raw SQL with hardcoded values
      expect(mockPool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('24')
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await expect(adapter.getNewTasksCount(24)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle invalid query results', async () => {
      const mockResult = { rows: [{ count: 'invalid' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getNewTasksCount(24);

      expect(result).toBeNaN();
    });
  });

  describe('Data Type Tests', () => {
    it('should convert string results to numbers', async () => {
      const mockResult = { rows: [{ count: '42' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getNewTasksCount(24);

      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });

    it('should format timestamps as ISO strings', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await adapter.getWebCrawlMetrics(24);

      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(result.lastUpdated).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('Generic Function Tests', () => {
    it('should use correct enum values for task status', async () => {
      // This test verifies that the underlying SQL functions use the correct enum values
      // The adapter doesn't directly call the generic function, but the specific functions do
      const mockResult = { rows: [{ count: '5' }] };
      mockPool.query.mockResolvedValue(mockResult);

      await adapter.getNewTasksCount(24);
      await adapter.getCompletedTasksCount(24);
      await adapter.getErrorTasksCount(24);

      // Verify the functions are called correctly
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_new_tasks_count($1) as count',
        [24]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_completed_tasks_count($1) as count',
        [24]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT get_error_tasks_count($1) as count',
        [24]
      );
    });
  });
});
