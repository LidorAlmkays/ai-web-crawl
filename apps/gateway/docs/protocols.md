# Communication Protocols

The Gateway Service uses two primary communication protocols to interact with clients and other backend services: **WebSockets** for real-time client communication and **Kafka** for asynchronous messaging between services.

## WebSocket API

The WebSocket API is the main entry point for clients to submit crawl requests and receive real-time updates.

- **URL**: `ws://localhost:3000`

### Connection Lifecycle

1.  A client establishes a WebSocket connection to the server.
2.  Upon successful connection, the server assigns a unique `connectionId` to the client. This ID is used to track the client and route notifications back to it.
3.  The client can then send and receive messages as long as the connection is active.
4.  If the connection is lost, the client is responsible for reconnecting.

### Message Format

All messages exchanged over WebSocket must be in JSON format and follow a standardized structure:

```json
{
  "type": "message_type",
  "payload": {
    ...
  }
}
```

- `type` (string, required): The type of the message. This determines how the message is routed and processed.
- `payload` (object, required): The data associated with the message. The structure of the payload depends on the message type.

### Supported Message Types

#### Inbound (Client to Server)

##### `webscrape`

This message type is used to submit a new URL for crawling.

- **Type**: `webscrape`
- **Payload**: `SubmitCrawlRequestDto`

**Example:**

```json
{
  "type": "webscrape",
  "payload": {
    "url": "https://www.example.com"
  }
}
```

**Payload Schema (`SubmitCrawlRequestDto`):**

- `url` (string, required): The URL to be crawled. It must be a valid URL format.

#### Outbound (Server to Client)

##### `crawl_update`

This message type is used to send updates about the status of a crawl request to the originating client.

- **Type**: `crawl_update`
- **Payload**: `CrawlStateEntity`

**Example:**

```json
{
  "type": "crawl_update",
  "payload": {
    "id": "e4a5b6c7-8d9e-4f0a-1b2c-3d4e5f6a7b8c",
    "status": "processing",
    "url": "https://www.example.com",
    "data": null,
    "error": null,
    "createdAt": "2023-10-27T10:00:00.000Z",
    "updatedAt": "2023-10-27T10:00:05.000Z"
  }
}
```

**Payload Schema (`CrawlStateEntity`):**

- `id` (string): The unique ID of the crawl request.
- `status` (string): The current status of the crawl (`pending`, `processing`, `completed`, `failed`).
- `url` (string): The URL being crawled.
- `data` (any, optional): The crawled data, if the request was successful.
- `error` (string, optional): An error message, if the request failed.
- `createdAt` (string): The timestamp when the request was created.
- `updatedAt` (string): The timestamp when the request was last updated.

## Kafka Messaging

Kafka is used for asynchronous communication between the Gateway Service and other backend services. This decouples the services and ensures that the system is resilient to failures.

### Topics

#### `crawl_requests` (Outbound)

The Gateway Service publishes messages to this topic when a new crawl request is received from a client. Backend worker services consume from this topic to process the requests.

- **Topic Name**: `crawl_requests`
- **Message Format**: `CrawlRequestMessage`

**Message Schema (`CrawlRequestMessage`):**

- `crawlId` (string): The unique ID of the crawl request.
- `url` (string): The URL to be crawled.
- `clientId` (string): The `connectionId` of the client that initiated the request.

#### `crawl_responses` (Inbound)

The Gateway Service consumes messages from this topic to receive the results of crawl requests from the worker services.

- **Topic Name**: `crawl_responses`
- **Message Format**: `CrawlResponseMessage`

**Message Schema (`CrawlResponseMessage`):**

- `crawlId` (string): The unique ID of the crawl request.
- `clientId` (string): The `connectionId` of the client to be notified.
- `status` (string): The final status of the crawl (`completed` or `failed`).
- `data` (any, optional): The crawled data, if successful.
- `error` (string, optional): An error message, if the crawl failed.
