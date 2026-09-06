import { createServer } from 'node:http';
import { callbackify } from 'node:util';
import { app } from './app.ts';
import { connectDB, disconnectDB } from './config/database.ts';
import { loadLocalEnv } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { chatService } from './modules/chat/chat.service.ts';
import { registerChatWebSocketHandlers } from './web-socket/chat/chat-socket.ts';
import { attachWebSocketServer, io } from './web-socket/web-socket.ts';

type ShutdownSignal = 'SIGINT' | 'SIGTERM';

interface StartListeningInput {
  host: string;
  httpServer: ReturnType<typeof createServer>;
  port: number;
}

interface BeginShutdownInput {
  signal: ShutdownSignal;
}

interface RegisterGracefulShutdownInput {
  httpServer: ReturnType<typeof createServer>;
}

interface ShutdownSucceeded {
  succeeded: true;
}

interface ShutdownFailed {
  error: Error;
  succeeded: false;
}

type ShutdownResult = ShutdownFailed | ShutdownSucceeded;

const gracefulShutdownTimeoutMs = 10_000;
const loopbackHost = '127.0.0.1';

const getPort = (): number => {
  const configuredPort = process.env['PORT'];

  if (!configuredPort) {
    throw new Error('PORT is required');
  }

  const port = Number(configuredPort);

  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer from 1 through 65535');
  }

  return port;
};

const startListening = ({ host, httpServer, port }: StartListeningInput): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      httpServer.off('error', onError);
      httpServer.off('listening', onListening);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const onListening = (): void => {
      cleanup();
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);

    try {
      httpServer.listen(port, host);
    } catch (error) {
      cleanup();
      if (error instanceof Error) {
        reject(error);
        return;
      }

      reject(new Error('HTTP server failed to listen'));
    }
  });
};

const shutdownServer = async (): Promise<ShutdownResult> => {
  try {
    let socketCloseError: Error | undefined;

    // Socket.IO first disconnects clients and closes Engine.IO, then closes the shared HTTP server.
    await io.close((error) => {
      if (error) {
        socketCloseError = error;
      }
    });

    if (socketCloseError) {
      throw socketCloseError;
    }

    await disconnectDB();
    return { succeeded: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error, succeeded: false };
    }

    return {
      error: new Error('Server shutdown failed', { cause: error }),
      succeeded: false,
    };
  }
};

const registerGracefulShutdown = ({ httpServer }: RegisterGracefulShutdownInput): void => {
  let shutdownStarted = false;
  const shutdownServerWithCallback = callbackify(shutdownServer);

  const beginShutdown = ({ signal }: BeginShutdownInput): void => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;
    logger.info({
      message: "Let's Glance backend is shutting down",
      detail: `signal=${signal}`,
    });

    const forcedShutdownTimer = setTimeout(() => {
      logger.fail({
        message: "Let's Glance backend shutdown timed out",
        detail: `timeoutMs=${String(gracefulShutdownTimeoutMs)}`,
      });
      httpServer.closeAllConnections();
      // A non-zero exit tells the process supervisor that graceful cleanup did not finish.
      process.exit(1);
    }, gracefulShutdownTimeoutMs);
    forcedShutdownTimer.unref();

    shutdownServerWithCallback((_callbackError, result) => {
      clearTimeout(forcedShutdownTimer);

      if (!result.succeeded) {
        logger.fail({
          message: "Let's Glance backend failed to shut down",
          error: result.error,
        });
        process.exit(1);
      }

      logger.success({
        message: "Let's Glance backend shut down",
      });
      // All owned network and database resources are closed, so exit cleanly for the supervisor.
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => {
    beginShutdown({ signal: 'SIGTERM' });
  });
  process.once('SIGINT', () => {
    beginShutdown({ signal: 'SIGINT' });
  });
};

try {
  loadLocalEnv();
} catch (error) {
  logger.fail({
    message: 'Failed to load .env',
    error,
  });
  process.exit(1);
}

// In Node ESM, top-level await keeps database and network startup in a predictable order.
try {
  await connectDB();

  const port = getPort();
  // Like React/frontend app construction, Express only defines behavior and cannot own a network port.
  // This Node HTTP server lets Express requests and Socket.IO upgrades share one listener.
  const httpServer = createServer(app);
  attachWebSocketServer({ httpServer });
  registerChatWebSocketHandlers({
    markMessagesDelivered: chatService.markMessagesDelivered,
    markMessagesRead: chatService.markMessagesRead,
  });

  // Start listening for HTTP requests on the specified port.
  await startListening({ host: loopbackHost, httpServer, port });
  registerGracefulShutdown({ httpServer });
  logger.success({
    message: "Let's Glance backend is running",
    detail: `http://${loopbackHost}:${String(port)}`,
  });
} catch (error) {
  logger.fail({
    message: "Let's Glance backend failed to start",
    error,
  });
  // `process` is Node's handle for this running program (there is no browser `window` here).
  // `exit(1)` stops the server. `1` means failure; `0` would mean success.
  process.exit(1);
}
