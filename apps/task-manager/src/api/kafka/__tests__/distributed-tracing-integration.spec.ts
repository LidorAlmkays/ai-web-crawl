import { TraceTestHelper } from '../../../test-utils/trace-test-helper';
import { TraceContextManager } from '../../../common/utils/tracing/trace-context';
import { TraceManager } from '../../../common/utils/tracing/trace-manager';
import { TraceAttributes } from '../../../common/utils/tracing/trace-attributes';

describe('Distributed Tracing Integration', () => {
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = TraceManager.getInstance();
    TraceTestHelper.clearCapturedSpans();
    TraceTestHelper.captureSpans();
  });

  afterEach(() => {
    TraceTestHelper.clearCapturedSpans();
  });

  describe('Kafka Message with Trace Context', () => {
    it('should process Kafka message with trace context and create child spans', async () => {
      // Create a distributed tracing scenario
      const scenario = TraceTestHelper.createDistributedTracingScenario();
      const { gatewayTraceId, gatewaySpanId, kafkaMessages } = scenario;

      // Process the new task message
      const newTaskMessage = kafkaMessages[0];

      // Extract trace context from Kafka headers
      const traceContext = TraceContextManager.extractFromKafkaHeaders(
        newTaskMessage.headers
      );

      expect(traceContext).toBeDefined();
      expect(traceContext?.traceId).toBe(gatewayTraceId);
      expect(traceContext?.spanId).toBe(gatewaySpanId);

      // Process message with trace context
      await traceManager.traceOperationWithContext(
        'kafka.new_task_processing',
        TraceContextManager.toSpanContext(traceContext!),
        async () => {
          // Simulate task processing
          await traceManager.traceOperation('headers_validated', async () => {
            // Validate headers
            expect(newTaskMessage.headers.traceparent).toBeDefined();
            expect(newTaskMessage.headers.status).toBe('new');
          });

          await traceManager.traceOperation('body_validated', async () => {
            // Validate message body
            const body = JSON.parse(newTaskMessage.value);
            expect(body.user_email).toBe('test@example.com');
            expect(body.user_query).toBe('Find product information');
          });

          await traceManager.traceOperation(
            'create_web_crawl_task',
            async () => {
              // Simulate task creation
              await traceManager.traceOperation(
                'domain_entity_created',
                async () => {
                  // Create domain entity
                  traceManager.addEvent('task_entity_created', {
                    taskId: 'test-task-123',
                    status: 'new',
                  });
                }
              );

              await traceManager.traceOperation(
                'database_create_web_crawl_task',
                async () => {
                  // Simulate database operation
                  await traceManager.traceOperation(
                    'database_query_executing',
                    async () => {
                      // Execute database query
                      traceManager.setAttributes(
                        TraceAttributes.createDatabaseAttributes(
                          'INSERT INTO web_crawl_tasks (id, status, user_email, user_query, base_url) VALUES ($1, $2, $3, $4, $5)',
                          'web_crawl_tasks',
                          'INSERT'
                        )
                      );
                    }
                  );

                  await traceManager.traceOperation(
                    'database_query_successful',
                    async () => {
                      // Query successful
                      traceManager.addEvent('task_persisted', {
                        taskId: 'test-task-123',
                        timestamp: new Date().toISOString(),
                      });
                    }
                  );
                }
              );
            }
          );

          await traceManager.traceOperation('task_created', async () => {
            // Task creation complete
            traceManager.addEvent('task_creation_complete', {
              taskId: 'test-task-123',
              status: 'new',
            });
          });
        },
        TraceAttributes.createKafkaAttributes({
          topic: newTaskMessage.topic,
          partition: newTaskMessage.partition,
          offset: newTaskMessage.offset,
        })
      );

      // Validate captured spans
      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans.length).toBeGreaterThan(0);

      // Validate trace structure
      const validation = TraceTestHelper.validateTraceStructure(capturedSpans);
      expect(validation.isValid).toBe(true);
      expect(validation.traceId).toBe(gatewayTraceId);

      // Validate span hierarchy
      const hierarchyErrors =
        TraceTestHelper.validateSpanHierarchy(capturedSpans);
      expect(hierarchyErrors).toHaveLength(0);
    });

    it('should process complete task message with same trace context', async () => {
      // Create a distributed tracing scenario
      const scenario = TraceTestHelper.createDistributedTracingScenario();
      const { gatewayTraceId, gatewaySpanId, kafkaMessages } = scenario;

      // Process the complete task message
      const completeTaskMessage = kafkaMessages[1];

      // Extract trace context from Kafka headers
      const traceContext = TraceContextManager.extractFromKafkaHeaders(
        completeTaskMessage.headers
      );

      expect(traceContext).toBeDefined();
      expect(traceContext?.traceId).toBe(gatewayTraceId);

      // Process message with trace context
      await traceManager.traceOperationWithContext(
        'kafka.complete_task_processing',
        TraceContextManager.toSpanContext(traceContext!),
        async () => {
          // Simulate task completion processing
          await traceManager.traceOperation('headers_extracted', async () => {
            // Extract headers
            expect(completeTaskMessage.headers.traceparent).toBeDefined();
            expect(completeTaskMessage.headers.status).toBe('completed');
          });

          await traceManager.traceOperation('body_validated', async () => {
            // Validate message body
            const body = JSON.parse(completeTaskMessage.value);
            expect(body.crawl_result).toBe(
              'Found 5 products matching criteria'
            );
          });

          await traceManager.traceOperation(
            'update_web_crawl_task_status',
            async () => {
              // Simulate task status update
              await traceManager.traceOperation('task_retrieved', async () => {
                // Retrieve existing task
                traceManager.addEvent('task_found', {
                  taskId: 'test-task-123',
                  currentStatus: 'new',
                });
              });

              await traceManager.traceOperation(
                'domain_entity_updated',
                async () => {
                  // Update domain entity
                  traceManager.addEvent('task_status_updated', {
                    taskId: 'test-task-123',
                    oldStatus: 'new',
                    newStatus: 'completed',
                  });
                }
              );

              await traceManager.traceOperation(
                'database_update_web_crawl_task',
                async () => {
                  // Simulate database update
                  await traceManager.traceOperation(
                    'database_query_executing',
                    async () => {
                      // Execute update query
                      traceManager.setAttributes(
                        TraceAttributes.createDatabaseAttributes(
                          'UPDATE web_crawl_tasks SET status = $1, updated_at = $2 WHERE id = $3',
                          'web_crawl_tasks',
                          'UPDATE'
                        )
                      );
                    }
                  );

                  await traceManager.traceOperation(
                    'database_query_successful',
                    async () => {
                      // Update successful
                      traceManager.addEvent('task_updated', {
                        taskId: 'test-task-123',
                        timestamp: new Date().toISOString(),
                      });
                    }
                  );
                }
              );
            }
          );

          await traceManager.traceOperation('task_completed', async () => {
            // Task completion complete
            traceManager.addEvent('task_completion_complete', {
              taskId: 'test-task-123',
              status: 'completed',
            });
          });
        },
        TraceAttributes.createKafkaAttributes({
          topic: completeTaskMessage.topic,
          partition: completeTaskMessage.partition,
          offset: completeTaskMessage.offset,
        })
      );

      // Validate captured spans
      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans.length).toBeGreaterThan(0);

      // Validate trace structure
      const validation = TraceTestHelper.validateTraceStructure(capturedSpans);
      expect(validation.isValid).toBe(true);
      expect(validation.traceId).toBe(gatewayTraceId);
    });
  });

  describe('Error Handling with Trace Context', () => {
    it('should maintain trace context when errors occur', async () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const kafkaMessage = TraceTestHelper.createKafkaMessageWithTrace(
        traceId,
        spanId,
        'new',
        { test: 'data' }
      );

      const traceContext = TraceContextManager.extractFromKafkaHeaders(
        kafkaMessage.headers
      );

      // Process message with error
      await expect(
        traceManager.traceOperationWithContext(
          'kafka.error_processing',
          TraceContextManager.toSpanContext(traceContext!),
          async () => {
            // Simulate error during processing
            await traceManager.traceOperation('validation_failed', async () => {
              throw new Error('Validation failed: Invalid task data');
            });
          }
        )
      ).rejects.toThrow('Validation failed: Invalid task data');

      // Validate that error was captured in trace
      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans.length).toBeGreaterThan(0);

      // Check that error span has error status
      const errorSpan = capturedSpans.find(
        (span) => span.name === 'validation_failed'
      );
      expect(errorSpan).toBeDefined();
    });
  });

  describe('Performance Testing', () => {
    it('should handle multiple concurrent messages with same trace', async () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();

      // Create multiple messages with same trace context
      const messages = Array.from({ length: 5 }, (_, i) =>
        TraceTestHelper.createKafkaMessageWithTrace(traceId, spanId, 'new', {
          taskId: `task-${i}`,
          data: `data-${i}`,
        })
      );

      // Process all messages concurrently
      const processingPromises = messages.map(async (message, index) => {
        const traceContext = TraceContextManager.extractFromKafkaHeaders(
          message.headers
        );

        return traceManager.traceOperationWithContext(
          `kafka.concurrent_processing_${index}`,
          TraceContextManager.toSpanContext(traceContext!),
          async () => {
            // Simulate processing
            await new Promise((resolve) => setTimeout(resolve, 10));
            return `processed-${index}`;
          }
        );
      });

      const results = await Promise.all(processingPromises);

      // Validate all messages were processed
      expect(results).toHaveLength(5);
      expect(results).toEqual([
        'processed-0',
        'processed-1',
        'processed-2',
        'processed-3',
        'processed-4',
      ]);

      // Validate trace integrity
      const capturedSpans = TraceTestHelper.getCapturedSpans();
      const validation = TraceTestHelper.validateTraceStructure(capturedSpans);
      expect(validation.isValid).toBe(true);
      expect(validation.traceId).toBe(traceId);
    });

    it('should measure tracing overhead', async () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const kafkaMessage = TraceTestHelper.createKafkaMessageWithTrace(
        traceId,
        spanId,
        'new',
        { test: 'data' }
      );

      const traceContext = TraceContextManager.extractFromKafkaHeaders(
        kafkaMessage.headers
      );

      // Measure overhead of traced operation
      const overhead = await TraceTestHelper.measureTracingOverhead(
        async () => {
          await traceManager.traceOperationWithContext(
            'kafka.performance_test',
            TraceContextManager.toSpanContext(traceContext!),
            async () => {
              // Simulate some work
              await new Promise((resolve) => setTimeout(resolve, 5));
            }
          );
        }
      );

      // Tracing overhead should be minimal
      expect(overhead).toBeLessThan(50); // Less than 50ms overhead
    });
  });

  describe('Trace Context Propagation', () => {
    it('should propagate trace context through multiple operations', async () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const kafkaMessage = TraceTestHelper.createKafkaMessageWithTrace(
        traceId,
        spanId,
        'new',
        { test: 'data' }
      );

      const traceContext = TraceContextManager.extractFromKafkaHeaders(
        kafkaMessage.headers
      );

      // Simulate multi-layer processing
      await traceManager.traceOperationWithContext(
        'kafka.message_received',
        TraceContextManager.toSpanContext(traceContext!),
        async () => {
          // Layer 1: Message validation
          await traceManager.traceOperation('message_validation', async () => {
            expect(kafkaMessage.headers.traceparent).toBeDefined();
          });

          // Layer 2: Business logic
          await traceManager.traceOperation(
            'business_logic_processing',
            async () => {
              // Layer 3: Database operation
              await traceManager.traceOperation(
                'database_operation',
                async () => {
                  // Simulate database work
                  await new Promise((resolve) => setTimeout(resolve, 1));
                }
              );

              // Layer 3: External API call
              await traceManager.traceOperation(
                'external_api_call',
                async () => {
                  // Simulate API call
                  await new Promise((resolve) => setTimeout(resolve, 1));
                }
              );
            }
          );

          // Layer 2: Response preparation
          await traceManager.traceOperation(
            'response_preparation',
            async () => {
              // Prepare response
            }
          );
        }
      );

      // Validate trace hierarchy
      const capturedSpans = TraceTestHelper.getCapturedSpans();
      const hierarchyErrors =
        TraceTestHelper.validateSpanHierarchy(capturedSpans);
      expect(hierarchyErrors).toHaveLength(0);

      // Validate all spans have same trace ID
      const validation = TraceTestHelper.validateTraceStructure(capturedSpans);
      expect(validation.isValid).toBe(true);
      expect(validation.traceId).toBe(traceId);
    });
  });
});


