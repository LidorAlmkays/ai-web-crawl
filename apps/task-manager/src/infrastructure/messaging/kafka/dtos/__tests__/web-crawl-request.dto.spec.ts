import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { WebCrawlRequestHeaderDto, WebCrawlRequestBodyDto, WebCrawlRequestMessageDto } from '../web-crawl-request.dto';

describe('WebCrawlRequest DTOs (infrastructure)', () => {
	describe('WebCrawlRequestHeaderDto', () => {
		it('validates a correct header', async () => {
			const headerData = {
				task_id: '123e4567-e89b-12d3-a456-426614174000',
				timestamp: new Date().toISOString(),
				traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
				tracestate: 'test=value',
				correlation_id: 'corr-123',
				source: 'task-manager',
				version: '1.0.0',
			};

			const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
			const errors = await validate(header);
			expect(errors).toHaveLength(0);
		});

		it('rejects invalid uuid', async () => {
			const headerData = {
				task_id: 'invalid-uuid',
				timestamp: new Date().toISOString(),
			};
			const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
			const errors = await validate(header);
			expect(errors.length).toBeGreaterThan(0);
		});
	});

	describe('WebCrawlRequestBodyDto', () => {
		it('validates a correct body', async () => {
			const bodyData = {
				user_email: 'test@example.com',
				user_query: 'Find product information',
				base_url: 'https://example.com',
			};
			const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
			const errors = await validate(body);
			expect(errors).toHaveLength(0);
		});
	});

	describe('WebCrawlRequestMessageDto', () => {
		it('validates a complete message', async () => {
			const message = plainToClass(WebCrawlRequestMessageDto, {
				headers: {
					task_id: '123e4567-e89b-12d3-a456-426614174000',
					timestamp: new Date().toISOString(),
					traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
				},
				body: {
					user_email: 'test@example.com',
					user_query: 'Find product information',
					base_url: 'https://example.com',
				},
			});

			const errors = await validate(message);
			expect(errors).toHaveLength(0);
		});
	});
});
