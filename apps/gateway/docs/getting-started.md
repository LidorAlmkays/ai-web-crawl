# Getting Started

This guide will walk you through the process of setting up your development environment, installing the necessary dependencies, and running the Gateway Service for the first time.

## Prerequisites

Before you begin, make sure you have the following tools installed on your system:

- **[Node.js](https://nodejs.org/)**: We recommend using the latest LTS version (v18 or higher).
- **[Docker](https://www.docker.com/)**: Required for running the infrastructure services (Kafka, Redis, etc.).
- **[Docker Compose](https://docs.docker.com/compose/)**: Used to orchestrate the multi-container Docker applications.
- **[NPM](https://www.npmjs.com/)**: The Node.js package manager, which is included with Node.js.

## Installation

1.  **Clone the Repository**

    Start by cloning the project repository to your local machine:

    ```bash
    git clone <repository-url>
    cd webcrawling
    ```

2.  **Install Dependencies**

    Once you are in the project's root directory, you can install all the required dependencies using NPM:

    ```bash
    npm install
    ```

    This command will read the `package.json` file and install all the necessary packages for the entire monorepo.

## Running the Application

To run the Gateway Service, you need to start both the external infrastructure services and the application itself.

### 1. Start the Infrastructure Services

The project uses Docker Compose to manage the necessary infrastructure services, including Kafka, Zookeeper, and Redis. To start these services, run the following command from the root of the project:

```bash
docker-compose up -d
```

This command will download the required Docker images (if they are not already on your machine) and start the services in detached mode (`-d`), meaning they will run in the background.

You can verify that the services are running with the following command:

```bash
docker-compose ps
```

### 2. Start the Gateway Service

With the infrastructure services up and running, you can now start the Gateway Service. This project is managed as an Nx monorepo, which provides powerful tools for managing and running applications.

To start the Gateway Service, run the following command:

```bash
npm run start gateway
```

This command will compile the TypeScript code, start the application, and watch for any file changes, automatically restarting the server when a change is detected.

The Gateway Service will be available at `ws://localhost:3000`.

### 3. Verify the Application is Running

You can verify that the application is running by checking the console output for a message indicating that the server has started successfully. You should see something like:

```
[Gateway] WebSocket server is running on port 3000
```

## Interacting with the Service

Once the service is running, you can interact with it using a WebSocket client. You can use a simple command-line tool like `websocat` or a graphical client like Postman to send and receive messages.

**Example using `websocat`:**

1.  Connect to the server:

    ```bash
    websocat ws://localhost:3000
    ```

2.  Send a `webscrape` message:
    ```json
    {
      "type": "webscrape",
      "payload": {
        "url": "https://www.example.com"
      }
    }
    ```

You should receive a `crawl_update` message back from the server with the initial state of your request.
