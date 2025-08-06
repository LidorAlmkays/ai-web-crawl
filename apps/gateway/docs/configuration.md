# Configuration Guide

The Gateway Service is designed to be highly configurable, allowing you to adapt its behavior to different environments (development, staging, production) without changing the code. Configuration is managed through a combination of configuration files and environment variables.

## Configuration Files

The primary configuration files are located in the `src/config/` directory. The main entry point is `src/config/index.ts`, which aggregates and exports all the configuration objects.

- **`src/config/server.ts`**: Contains the configuration for the WebSocket server.
  - `port`: The port on which the WebSocket server will listen.
- **`src/config/kafka.ts`**: Contains the configuration for the Kafka client.
  - `clientId`: The client ID for the Kafka connection.
  - `brokers`: A list of Kafka broker addresses.
  - `logLevel`: The log level for the Kafka client.
- **`src/config/redis.ts`**: Contains the configuration for the Redis client.
  - `host`: The hostname of the Redis server.
  - `port`: The port of the Redis server.

## Environment Variables

While the configuration files define the structure of the configuration, the actual values are sourced from environment variables. This is a best practice for modern applications, as it allows for secure and flexible configuration management.

The project uses the `dotenv` package to load environment variables from a `.env` file in the root of the project. This is particularly useful for local development.

### Creating a `.env` File

To get started, create a `.env` file in the root of the `webcrawling` project. You can copy the example file if one is provided:

```bash
cp .env.example .env
```

### Supported Environment Variables

The following table lists all the environment variables used by the Gateway Service:

| Variable          | Description                             | Default Value     | Required |
| ----------------- | --------------------------------------- | ----------------- | -------- |
| `GATEWAY_PORT`    | The port for the WebSocket server.      | `3000`            | No       |
| `KAFKA_CLIENT_ID` | The client ID for the Kafka connection. | `gateway-service` | No       |
| `KAFKA_BROKERS`   | Comma-separated list of Kafka brokers.  | `localhost:9092`  | No       |
| `REDIS_HOST`      | The hostname of the Redis server.       | `localhost`       | No       |
| `REDIS_PORT`      | The port of the Redis server.           | `6379`            | No       |
| `LOG_LEVEL`       | The application's log level.            | `log`             | No       |

### How Configuration is Loaded

1.  When the application starts, the `dotenv` package loads the environment variables from the `.env` file.
2.  The configuration files in `src/config/` read these environment variables using `process.env`.
3.  If an environment variable is not set, a default value is used.
4.  The `src/config/index.ts` file exports the final configuration objects, which are then used throughout the application.

**Example: `src/config/server.ts`**

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('server', () => ({
  port: parseInt(process.env.GATEWAY_PORT, 10) || 3000,
}));
```

In this example, the server port is sourced from the `GATEWAY_PORT` environment variable. If it's not set, it defaults to `3000`.

## Configuration in Production

In a production environment, it is recommended to manage environment variables using the deployment platform's configuration management system (e.g., Kubernetes Secrets, Docker environment files, or your cloud provider's secret management service). The `.env` file should not be committed to version control and should only be used for local development.
