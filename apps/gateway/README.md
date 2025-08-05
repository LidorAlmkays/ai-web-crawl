# Gateway Service

A REST API gateway service built with Express.js following Clean Architecture principles. This service handles web crawling requests and publishes them to Kafka.

## Features

- **Clean Architecture**: Follows domain-driven design with clear separation of concerns
- **REST API**: HTTP endpoints for crawl request management
- **Kafka Integration**: Publishes crawl requests to Kafka topics
- **Structured Logging**: Comprehensive logging with correlation IDs
- **Error Handling**: Proper error handling and validation
- **Health Checks**: Built-in health check endpoint

## API Endpoints

### Submit Crawl Request

- **POST** `/api/crawl`
- **Description**: Submits a web crawling request
- **Request Body**:
  ```json
  {
    "url": "https://example.com",
    "query": "give me all the prices of products",
    "username": "john.doe"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Crawl request submitted successfully",
    "crawlRequest": {
      "url": "https://example.com",
      "query": "give me all the prices of products",
      "username": "john.doe",
      "hash": "a1b2c3d4e5f6...",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
  ```

### Health Check

- **GET** `/health`
- **Description**: Returns the health status of the service
- **Response**:
  ```json
  {
    "success": true,
    "message": "Gateway service is healthy",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

## Kafka Integration

The service publishes crawl requests to the `url-to-crawl` Kafka topic with the following message format:

```json
{
  "url": "https://example.com",
  "query": "give me all the prices of products",
  "hash": "a1b2c3d4e5f6..."
}
```

The hash is generated from the combination of `username + query + url` using SHA-256.

## Development

### Prerequisites

- Node.js 18+
- Nx CLI
- Docker and Docker Compose

### Running the Service

1. **Start Kafka Infrastructure**:

   ```bash
   docker-compose up -d
   ```

2. **Development Mode**:

   ```bash
   nx serve gateway
   ```

3. **Production Build**:

   ```bash
   nx build gateway
   ```

4. **Testing**:
   ```bash
   nx test gateway
   ```

### Environment Variables

Create a `.env` file in the `apps/gateway` directory:

```env
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/gateway
DATABASE_POOL_SIZE=10

# Logging Configuration
LOG_LEVEL=info

# Kafka Configuration
KAFKA_CLIENT_ID=gateway-crawl-request-publisher
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=url-to-crawl
```

## Architecture

This service follows Clean Architecture principles:

```
src/
├── app.ts                    # Application orchestrator
├── server.ts                 # Server bootstrap
├── config/                   # Configuration management
├── common/                   # Cross-cutting concerns
│   ├── interfaces/          # Shared interfaces
│   └── utils/              # Utilities (logger, etc.)
├── core/                    # Business logic
│   ├── domain/             # Domain entities
│   ├── application/        # Use cases
│   └── ports/              # Interface definitions
└── infrastructure/          # External integrations
    ├── messaging/           # Kafka messaging
    └── api/                # REST API adapters
        └── rest/
            ├── controllers/ # HTTP handlers
            ├── routes/      # Route definitions
            └── dtos/       # Data transfer objects
```

## Testing the API

### Using curl

```bash
# Submit a crawl request
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "query": "give me all the prices of products",
    "username": "john.doe"
  }'

# Check health
curl http://localhost:3000/health
```

### Using Postman

1. Create a new POST request to `http://localhost:3000/api/crawl`
2. Set Content-Type header to `application/json`
3. Add request body:
   ```json
   {
     "url": "https://example.com",
     "query": "give me all the prices of products",
     "username": "john.doe"
   }
   ```

## Kafka UI

Access the Kafka UI at `http://localhost:8080` to monitor topics and messages.

## Logging

The service uses structured logging with the following levels:

- **DEBUG**: Detailed debugging information
- **INFO**: General information about application flow
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages for failures

Logs include correlation IDs and relevant context for debugging.

## Notes

- This implementation publishes crawl requests to Kafka for processing
- The service generates a unique hash for each request
- Console output shows the crawl request details
- Kafka messages are published to the `url-to-crawl` topic
