# Development Guide

This document provides comprehensive information about development practices, coding standards, testing, and contribution guidelines for the Task Manager Service.

## 📋 Overview

This guide covers:
- **Development Setup**: Environment configuration and tooling
- **Coding Standards**: TypeScript, DTO validation, and architectural patterns
- **Testing Practices**: Unit, integration, and end-to-end testing
- **Contribution Guidelines**: Code review, documentation, and release processes

## 🚀 Development Setup

### Prerequisites
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ (comes with Node.js)
- **Git**: Version 2.30+
- **Docker**: Version 20.10+ (for local services)
- **Docker Compose**: Version 2.0+ (for local services)

### Initial Setup

#### 1. Clone Repository
```bash
git clone <repository-url>
cd ai-web-crawl
```

#### 2. Install Dependencies
```bash
# Install workspace dependencies
npm install

# Install task-manager specific dependencies
cd apps/task-manager
npm install
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit configuration for your environment
nano .env
```

#### 4. Database Setup
```bash
# Start PostgreSQL (if using Docker)
docker-compose -f ../../deployment/devops/docker-compose.yml up -d postgres

# Apply database schema
npm run apply-schema
```

#### 5. Start Services
```bash
# Start Kafka (if using Docker)
docker-compose -f ../../deployment/devops/docker-compose.yml up -d kafka

# Start observability stack (optional)
docker-compose -f ../../deployment/observability/docker-compose.yml up -d
```

### Development Tools

#### IDE Configuration
- **VS Code**: Recommended with extensions
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Docker
  - GitLens

#### VS Code Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.suggest.autoImports": true
}
```

#### Git Hooks
```bash
# Install husky for git hooks
npm install -g husky

# Setup pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run typecheck"
```

## 📝 Coding Standards

### TypeScript Standards

#### File Naming
- **PascalCase**: Classes, interfaces, types, enums
- **camelCase**: Variables, functions, methods
- **kebab-case**: File names, directories
- **UPPER_SNAKE_CASE**: Constants

#### File Structure
```
src/
├── api/                    # API layer
│   ├── kafka/             # Kafka consumers and handlers
│   └── rest/              # REST API controllers
├── application/           # Application services
│   ├── ports/            # Port interfaces
│   └── services/         # Business logic services
├── common/               # Shared utilities
│   ├── utils/           # Utility functions
│   ├── types/           # Type definitions
│   └── enums/           # Enumerations
├── config/              # Configuration management
├── domain/              # Domain entities and business logic
└── infrastructure/      # External integrations
    ├── persistence/     # Database adapters
    └── messaging/       # Kafka adapters
```

#### Import Organization
```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';
import { join } from 'path';

// 2. External dependencies
import { z } from 'zod';
import { Kafka } from 'kafkajs';

// 3. Internal modules (absolute imports)
import { logger } from '@/common/utils/logger';
import { WebCrawlTask } from '@/domain/entities/web-crawl-task.entity';

// 4. Relative imports
import { TaskStatus } from '../common/enums/task-status.enum';
```

### DTO Validation Standards

#### DTO Class Definition
```typescript
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new web crawl task
 * Validates user input with comprehensive validation rules
 */
export class CreateWebCrawlTaskDto {
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  userQuery: string;

  @IsUrl()
  @IsNotEmpty()
  originalUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Export type alias for the class
export type CreateWebCrawlTaskDtoType = CreateWebCrawlTaskDto;
```

#### Validation Rules
1. **ALWAYS** use `class-validator` decorators
2. **ALWAYS** define DTOs as classes, never interfaces
3. **ALWAYS** export both class and type alias
4. **ALWAYS** add JSDoc comments for complex validation
5. **ALWAYS** use appropriate validation decorators

### Architectural Patterns

#### Clean Architecture
```typescript
// Domain Entity (no dependencies)
export class WebCrawlTask {
  // Pure business logic
}

// Application Service (depends on domain)
export class WebCrawlTaskManagerService {
  constructor(
    private readonly repository: IWebCrawlTaskRepositoryPort
  ) {}
}

// Infrastructure Adapter (implements port)
export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  // Database implementation
}
```

#### Dependency Injection
```typescript
// Port (contract)
export interface IWebCrawlTaskRepositoryPort {
  createWebCrawlTask(...): Promise<WebCrawlTask>;
}

// Adapter (implementation)
export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  // Implementation
}

// Service (uses port)
export class WebCrawlTaskManagerService {
  constructor(
    private readonly repository: IWebCrawlTaskRepositoryPort
  ) {}
}
```

### Error Handling

#### Error Types
```typescript
// Domain errors
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task with ID ${taskId} not found`);
    this.name = 'TaskNotFoundError';
  }
}

// Application errors
export class ValidationError extends Error {
  constructor(message: string, public readonly details: any) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

#### Error Handling Patterns
```typescript
// Service layer error handling
async createWebCrawlTask(userEmail: string, userQuery: string, originalUrl: string): Promise<WebCrawlTask> {
  try {
    // Business logic
    const task = await this.repository.createWebCrawlTask(userEmail, userQuery, originalUrl, new Date());
    return task;
  } catch (error) {
    logger.error('Failed to create web crawl task', {
      error: error instanceof Error ? error.message : String(error),
      userEmail,
      userQuery,
      originalUrl,
    });
    throw new TaskCreationError('Failed to create web crawl task', error);
  }
}
```

## 🧪 Testing Practices

### Testing Structure
```
src/
├── __tests__/              # Test files
│   ├── integration/        # Integration tests
│   └── unit/              # Unit tests
├── test-utils/            # Test utilities
└── test-setup.ts          # Test configuration
```

### Unit Testing

#### Test File Naming
- **Test files**: `*.spec.ts` or `*.test.ts`
- **Test utilities**: `test-utils/` directory
- **Test setup**: `test-setup.ts`

#### Unit Test Example
```typescript
import { WebCrawlTask } from '../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../common/enums/task-status.enum';

describe('WebCrawlTask', () => {
  describe('create', () => {
    it('should create a new task with NEW status', () => {
      const task = WebCrawlTask.create(
        'task-123',
        'user@example.com',
        'Find products',
        'https://example.com',
        new Date()
      );

      expect(task.id).toBe('task-123');
      expect(task.status).toBe(TaskStatus.NEW);
      expect(task.userEmail).toBe('user@example.com');
    });
  });

  describe('markAsCompleted', () => {
    it('should mark task as completed with result', () => {
      const task = WebCrawlTask.create(
        'task-123',
        'user@example.com',
        'Find products',
        'https://example.com',
        new Date()
      );

      task.markAsCompleted('Found 5 products');

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.result).toBe('Found 5 products');
      expect(task.finishedAt).toBeDefined();
    });
  });
});
```

### Integration Testing

#### Database Integration Tests
```typescript
import { WebCrawlTaskRepositoryAdapter } from '../infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';
import { PostgresFactory } from '../infrastructure/persistence/postgres/postgres.factory';

describe('WebCrawlTaskRepositoryAdapter Integration', () => {
  let repository: WebCrawlTaskRepositoryAdapter;
  let postgresFactory: PostgresFactory;

  beforeAll(async () => {
    postgresFactory = new PostgresFactory(postgresConfig);
    await postgresFactory.waitForInitialization();
    repository = new WebCrawlTaskRepositoryAdapter(postgresFactory);
  });

  afterAll(async () => {
    await postgresFactory.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await postgresFactory.getPool().query('DELETE FROM web_crawl_tasks');
  });

  it('should create and retrieve a web crawl task', async () => {
    const task = await repository.createWebCrawlTask(
      'user@example.com',
      'Find products',
      'https://example.com',
      new Date()
    );

    const retrievedTask = await repository.findWebCrawlTaskById(task.id);

    expect(retrievedTask).toBeDefined();
    expect(retrievedTask?.id).toBe(task.id);
    expect(retrievedTask?.userEmail).toBe('user@example.com');
  });
});
```

#### Kafka Integration Tests
```typescript
import { Kafka } from 'kafkajs';
import { TaskStatusConsumer } from '../api/kafka/consumers/task-status.consumer';

describe('TaskStatusConsumer Integration', () => {
  let kafka: Kafka;
  let consumer: TaskStatusConsumer;

  beforeAll(async () => {
    kafka = new Kafka({
      clientId: 'test-consumer',
      brokers: ['localhost:9092'],
    });
    consumer = new TaskStatusConsumer('task-status');
  });

  afterAll(async () => {
    await kafka.disconnect();
  });

  it('should consume task status messages', async () => {
    const message = {
      taskId: 'test-task-123',
      status: 'completed',
      result: 'Test result',
    };

    // Test message consumption
    await consumer.consume({
      topic: 'task-status',
      partition: 0,
      message: {
        key: Buffer.from('test-key'),
        value: Buffer.from(JSON.stringify(message)),
        timestamp: Date.now(),
      },
    });

    // Verify message was processed
    // Add assertions based on your implementation
  });
});
```

### End-to-End Testing

#### API End-to-End Tests
```typescript
import request from 'supertest';
import { app } from '../app';

describe('Task Manager API E2E', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('GET /api/metrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });
});
```

### Test Utilities

#### Test Data Generators
```typescript
// test-utils/task-generator.ts
export class TaskGenerator {
  static createValidTask(overrides: Partial<WebCrawlTask> = {}): WebCrawlTask {
    return WebCrawlTask.create(
      overrides.id || 'test-task-123',
      overrides.userEmail || 'test@example.com',
      overrides.userQuery || 'Test query',
      overrides.originalUrl || 'https://example.com',
      overrides.receivedAt || new Date()
    );
  }

  static createCompletedTask(result: string = 'Test result'): WebCrawlTask {
    const task = this.createValidTask();
    task.markAsCompleted(result);
    return task;
  }
}
```

#### Mock Factories
```typescript
// test-utils/mock-factory.ts
export class MockFactory {
  static createMockRepository(): jest.Mocked<IWebCrawlTaskRepositoryPort> {
    return {
      createWebCrawlTask: jest.fn(),
      findWebCrawlTaskById: jest.fn(),
      findWebCrawlTasksByStatus: jest.fn(),
      updateWebCrawlTask: jest.fn(),
      countWebCrawlTasksByStatus: jest.fn(),
    };
  }
}
```

## 🔧 Development Commands

### Nx Commands
```bash
# Type checking
nx typecheck task-manager

# Linting
nx lint task-manager

# Testing
nx test task-manager

# Building
nx build task-manager

# Development server
nx serve task-manager
```

### NPM Scripts
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Test Kafka connection
npm run test-kafka

# Publish test task
npm run publish-new-task

# Test task updates
npm run test-task-updates
```

### Database Commands
```bash
# Apply schema
npm run apply-schema

# Reset database (development only)
npm run reset-db

# Run migrations
npm run migrate
```

## 📊 Code Quality

### Linting Configuration
```javascript
// eslint.config.mjs
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      
      // General rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
    },
  },
];
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

## 🤝 Contribution Guidelines

### Code Review Process

#### Pull Request Checklist
- [ ] **Tests**: All tests pass
- [ ] **Linting**: No linting errors
- [ ] **Type Checking**: No TypeScript errors
- [ ] **Documentation**: Updated relevant documentation
- [ ] **Commits**: Clear commit messages
- [ ] **Coverage**: Maintained or improved test coverage

#### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(task-manager): add task status update endpoint

fix(database): resolve connection pool leak

docs(api): update health check endpoint documentation
```

### Documentation Standards

#### Code Documentation
```typescript
/**
 * Creates a new web crawl task and persists it to the database
 *
 * This method handles the complete business logic for task creation:
 * 1. Creates a new WebCrawlTask domain entity with NEW status
 * 2. Persists the task to the database via the repository
 * 3. Logs the creation event for monitoring
 *
 * @param userEmail - Email address of the user requesting the task
 * @param userQuery - The search query or instruction for the web crawl
 * @param originalUrl - The URL that was originally crawled
 * @returns Promise resolving to the created WebCrawlTask entity
 * @throws Error - When task creation fails in the repository
 *
 * @example
 * ```typescript
 * const task = await service.createWebCrawlTask(
 *   'user@example.com',
 *   'Find product information',
 *   'https://example.com'
 * );
 * ```
 */
async createWebCrawlTask(
  userEmail: string,
  userQuery: string,
  originalUrl: string
): Promise<WebCrawlTask> {
  // Implementation
}
```

#### README Documentation
- **Overview**: Clear description of the component
- **Setup**: Step-by-step setup instructions
- **Usage**: Examples of how to use the component
- **API**: Documentation of public interfaces
- **Configuration**: Available configuration options
- **Testing**: How to run tests
- **Contributing**: Guidelines for contributions

### Release Process

#### Version Management
```bash
# Bump version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

#### Release Checklist
- [ ] **Version**: Bump version in package.json
- [ ] **Changelog**: Update CHANGELOG.md
- [ ] **Tests**: All tests pass
- [ ] **Build**: Production build succeeds
- [ ] **Documentation**: Update documentation
- [ ] **Tag**: Create git tag
- [ ] **Deploy**: Deploy to staging/production

## 🔍 Debugging

### Development Debugging

#### VS Code Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Task Manager",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/task-manager/src/server.ts",
      "outFiles": ["${workspaceFolder}/apps/task-manager/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

#### Logging Debugging
```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Add debug statements
logger.debug('Processing task', {
  taskId,
  userEmail,
  status,
});
```

### Production Debugging

#### Health Check Debugging
```bash
# Check service health
curl http://localhost:3000/api/health/detailed

# Check database health
curl http://localhost:3000/api/health/database

# Check Kafka health
curl http://localhost:3000/api/health/kafka
```

#### Metrics Debugging
```bash
# View current metrics
curl http://localhost:3000/api/metrics/json

# View Prometheus metrics
curl http://localhost:3000/api/metrics
```

## 🚀 Performance Optimization

### Development Performance

#### Hot Reloading
```bash
# Enable hot reloading
nx serve task-manager --watch
```

#### Build Optimization
```bash
# Development build with source maps
nx build task-manager --configuration=development

# Production build
nx build task-manager --configuration=production
```

### Runtime Performance

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_web_crawl_tasks_status ON web_crawl_tasks(status);
CREATE INDEX idx_web_crawl_tasks_user_email ON web_crawl_tasks(user_email);
CREATE INDEX idx_web_crawl_tasks_created_at ON web_crawl_tasks(created_at);
```

#### Connection Pooling
```typescript
// Optimize connection pool settings
const poolConfig = {
  maxConnections: 20,
  idleTimeout: 60000,
  connectionTimeout: 5000,
};
```

For more information about development practices, see:
- [Configuration Guide](./configuration.md) - Development configuration
- [API Documentation](./api.md) - API development
- [Testing Guide](./testing.md) - Comprehensive testing practices
