import { KafkaMessageGenerator } from '../../../test-utils/kafka-message-generator';
import { TaskStatusHeaderDto } from '../dtos/task-status-header.dto';
import { NewTaskStatusMessageDto } from '../dtos/new-task-status-message.dto';
import { validateDto } from '../../../common/utils/validation';

describe('Kafka Message Structure Validation', () => {
  describe('Valid Message Structure', () => {
    it('should validate a properly formatted message with correct headers and body', async () => {
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'test@example.com',
        userQuery: 'Test query for web crawling',
        url: 'https://example.com',
      });

      // Validate headers
      const headerData = {
        id: validMessage.headers.id.toString(),
        task_type: validMessage.headers.task_type.toString(),
        status: validMessage.headers.status.toString(),
        timestamp: validMessage.headers.timestamp.toString(),
      };
      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(true);
      expect(validatedHeaders.validatedData?.id).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Validate body
      const bodyData = JSON.parse(validMessage.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(true);
      expect(validatedBody.validatedData?.user_email).toBe('test@example.com');
      expect(validatedBody.validatedData?.base_url).toBe('https://example.com');
    });

    it('should extract UUID correctly from message headers', async () => {
      const taskId = '550e8400-e29b-41d4-a716-446655440000';
      const message = KafkaMessageGenerator.generateValidMessage({ taskId });

      const headerData = {
        id: message.headers.id.toString(),
        task_type: message.headers.task_type.toString(),
        status: message.headers.status.toString(),
        timestamp: message.headers.timestamp.toString(),
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(true);
      expect(validatedHeaders.validatedData?.id).toBe(taskId);
    });

    it('should handle different valid user emails', async () => {
      const validEmails = [
        'test1@example.com',
        'test2@example.com',
        'test3@example.com',
      ];

      for (const email of validEmails) {
        const message = KafkaMessageGenerator.generateValidMessage({
          userEmail: email,
        });
        const bodyData = JSON.parse(message.value.toString());
        const validatedBody = await validateDto(
          NewTaskStatusMessageDto,
          bodyData
        );

        expect(validatedBody.isValid).toBe(true);
        expect(validatedBody.validatedData?.user_email).toBe(email);
      }
    });

    it('should handle valid URLs with different formats', async () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://subdomain.example.co.uk/path?param=value',
      ];

      for (const url of validUrls) {
        const message = KafkaMessageGenerator.generateValidMessage({ url });
        const bodyData = JSON.parse(message.value.toString());
        const validatedBody = await validateDto(
          NewTaskStatusMessageDto,
          bodyData
        );

        expect(validatedBody.isValid).toBe(true);
        expect(validatedBody.validatedData?.base_url).toBe(url);
      }
    });
  });

  describe('Invalid Message Structure', () => {
    it('should reject message with invalid UUID in header', async () => {
      const invalidMessage = KafkaMessageGenerator.generateInvalidUuidMessage();

      const headerData = {
        id: invalidMessage.headers.id.toString(),
        task_type: invalidMessage.headers.task_type.toString(),
        status: invalidMessage.headers.status.toString(),
        timestamp: invalidMessage.headers.timestamp.toString(),
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(false);
      expect(validatedHeaders.errorMessage).toContain('id');
      expect(validatedHeaders.errorMessage).toContain('UUID');
    });

    it('should reject message with missing required fields in body', async () => {
      const missingFieldsMessage =
        KafkaMessageGenerator.generateMissingFieldsMessage();
      const bodyData = JSON.parse(missingFieldsMessage.value.toString());

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('user_email');
    });

    it('should reject message with invalid enum values', async () => {
      const invalidEnumMessage =
        KafkaMessageGenerator.generateInvalidEnumMessage();
      const bodyData = JSON.parse(invalidEnumMessage.value.toString());

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('user_email');
    });

    it('should reject message with malformed JSON body', () => {
      const malformedMessage =
        KafkaMessageGenerator.generateMalformedJsonMessage();

      expect(() => {
        JSON.parse(malformedMessage.value.toString());
      }).toThrow(SyntaxError);
    });

    it('should reject message with missing headers', async () => {
      const missingHeadersMessage =
        KafkaMessageGenerator.generateMissingHeadersMessage();

      const headerData = {
        // Missing id field
        task_type: missingHeadersMessage.headers.task_type.toString(),
        status: missingHeadersMessage.headers.status.toString(),
        timestamp: missingHeadersMessage.headers.timestamp.toString(),
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(false);
      expect(validatedHeaders.errorMessage).toContain('id');
    });

    it('should reject message with invalid URL format', async () => {
      const invalidBodyData = {
        user_email: 'test@example.com',
        user_query: 'Test query',
        base_url: 'invalid://url:with:colons',
      };

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        invalidBodyData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('base_url');
    });

    it('should reject message with empty required fields', async () => {
      const emptyBodyData = {
        user_email: '', // Empty email
        user_query: 'Test query',
        base_url: '', // Empty URL
      };

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        emptyBodyData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('user_email');
      expect(validatedBody.errorMessage).toContain('base_url');
    });
  });

  describe('Message Header Validation', () => {
    it('should validate all required header fields', async () => {
      const message = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      });

      const headerData = {
        id: message.headers.id.toString(),
        task_type: message.headers.task_type.toString(),
        status: message.headers.status.toString(),
        timestamp: message.headers.timestamp.toString(),
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(true);
      expect(validatedHeaders.validatedData?.id).toBeDefined();
      expect(validatedHeaders.validatedData?.task_type).toBeDefined();
      expect(validatedHeaders.validatedData?.status).toBeDefined();
      expect(validatedHeaders.validatedData?.timestamp).toBeDefined();
    });

    it('should reject header with non-string timestamp', async () => {
      const message = KafkaMessageGenerator.generateValidMessage();
      const headerData = {
        id: message.headers.id.toString(),
        task_type: message.headers.task_type.toString(),
        status: message.headers.status.toString(),
        timestamp: 12345, // Invalid: should be string
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(false);
      expect(validatedHeaders.errorMessage).toContain('timestamp');
    });

    it('should reject header with invalid task_type', async () => {
      const message = KafkaMessageGenerator.generateValidMessage();
      const headerData = {
        id: message.headers.id.toString(),
        task_type: 'invalid-type', // Invalid task type
        status: message.headers.status.toString(),
        timestamp: message.headers.timestamp.toString(),
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(false);
      expect(validatedHeaders.errorMessage).toContain('task_type');
    });

    it('should reject header with invalid status', async () => {
      const message = KafkaMessageGenerator.generateValidMessage();
      const headerData = {
        id: message.headers.id.toString(),
        task_type: message.headers.task_type.toString(),
        status: 'invalid-status', // Invalid status
        timestamp: message.headers.timestamp.toString(),
      };

      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(false);
      expect(validatedHeaders.errorMessage).toContain('status');
    });
  });

  describe('Message Body Validation', () => {
    it('should validate all required body fields', async () => {
      const message = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'test@example.com',
        userQuery: 'Test query for web crawling',
        url: 'https://example.com',
      });

      const bodyData = JSON.parse(message.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(true);
      expect(validatedBody.validatedData?.user_email).toBeDefined();
      expect(validatedBody.validatedData?.user_query).toBeDefined();
      expect(validatedBody.validatedData?.base_url).toBeDefined();
    });

    it('should reject empty user_query field', async () => {
      const emptyQueryData = {
        user_email: 'test@example.com',
        user_query: '', // Empty query should be invalid
        base_url: 'https://example.com',
      };

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        emptyQueryData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('user_query');
    });

    it('should validate email format', async () => {
      const message = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'invalid-email-format',
        userQuery: 'Test query',
        url: 'https://example.com',
      });

      const bodyData = JSON.parse(message.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('user_email');
      expect(validatedBody.errorMessage).toContain('email');
    });

    it('should reject body with missing user_email', async () => {
      const missingEmailData = {
        // Missing user_email field
        user_query: 'Test query',
        base_url: 'https://example.com',
      };

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        missingEmailData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('user_email');
    });

    it('should reject body with missing base_url', async () => {
      const missingUrlData = {
        user_email: 'test@example.com',
        user_query: 'Test query',
        // Missing base_url field
      };

      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        missingUrlData
      );
      expect(validatedBody.isValid).toBe(false);
      expect(validatedBody.errorMessage).toContain('base_url');
    });
  });

  describe('Batch Message Processing', () => {
    it('should validate multiple messages in batch', async () => {
      const batchMessages = KafkaMessageGenerator.generateBatchMessages(3);

      for (let i = 0; i < batchMessages.length; i++) {
        const message = batchMessages[i];
        const bodyData = JSON.parse(message.value.toString());
        const validatedBody = await validateDto(
          NewTaskStatusMessageDto,
          bodyData
        );
        expect(validatedBody.isValid).toBe(true);
        expect(validatedBody.validatedData?.base_url).toBe(
          `https://example${i}.com`
        );
      }
    });

    it('should handle mixed valid and invalid messages', async () => {
      const validMessage = KafkaMessageGenerator.generateValidMessage();
      const invalidMessage =
        KafkaMessageGenerator.generateMissingFieldsMessage();

      // Valid message should pass
      const validBodyData = JSON.parse(validMessage.value.toString());
      const validResult = await validateDto(
        NewTaskStatusMessageDto,
        validBodyData
      );
      expect(validResult.isValid).toBe(true);

      // Invalid message should fail
      const invalidBodyData = JSON.parse(invalidMessage.value.toString());
      const invalidResult = await validateDto(
        NewTaskStatusMessageDto,
        invalidBodyData
      );
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long user queries', async () => {
      const longQuery = 'x'.repeat(1000);
      const message = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'test@example.com',
        userQuery: longQuery,
        url: 'https://example.com',
      });

      const bodyData = JSON.parse(message.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(true);
    });

    it('should handle special characters in URLs', async () => {
      const specialUrl =
        'https://example.com/path?param=value&another=test#fragment';
      const message = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'test@example.com',
        userQuery: 'Test query',
        url: specialUrl,
      });

      const bodyData = JSON.parse(message.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(true);
      expect(validatedBody.validatedData?.base_url).toBe(specialUrl);
    });

    it('should handle unicode characters in user queries', async () => {
      const unicodeQuery = 'Hello 世界 🌍 Test with emojis 🚀 📱';
      const message = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'test@example.com',
        userQuery: unicodeQuery,
        url: 'https://example.com',
      });

      const bodyData = JSON.parse(message.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(true);
      expect(validatedBody.validatedData?.user_query).toBe(unicodeQuery);
    });
  });
});
