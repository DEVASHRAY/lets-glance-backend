import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import argon2 from 'argon2';
import express, { type Application } from 'express';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { logger } from '../../lib/logger.ts';
import { SesCollection } from '../../lib/ses.ts';
import { errorMiddleware } from '../../middlewares/error-middleware.ts';
import { otpService } from '../otp/otp.service.ts';
import { User } from '../user/user.model.ts';
import { authOtpService } from './auth-otp.service.ts';
import { AuthConstantsCollection } from './auth.constants.ts';
import { authController } from './auth.controller.ts';

interface CreateTestErrorInput<Thrown> {
  error: Thrown;
  message: string;
}

interface StartedServer {
  origin: string;
  server: Server;
}

interface StartServerInput {
  app: Application;
}

interface CloseServerInput {
  server: Server;
}

const createTestError = <Thrown>({ error, message }: CreateTestErrorInput<Thrown>): Error => {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }

  return new Error(message);
};

const startServer = async ({ app }: StartServerInput): Promise<StartedServer> => {
  try {
    const server = await new Promise<Server>((resolve, reject) => {
      const onError = (error: Error): void => {
        reject(error);
      };
      const listeningServer = app.listen(0, () => {
        listeningServer.off('error', onError);
        resolve(listeningServer);
      });
      listeningServer.once('error', onError);
    });
    const address = server.address();

    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('Test server did not bind to a TCP port');
    }

    return {
      origin: `http://127.0.0.1:${String(address.port)}`,
      server,
    };
  } catch (error) {
    throw createTestError({ error, message: 'Starting the OTP test server failed' });
  }
};

const closeServer = async ({ server }: CloseServerInput): Promise<void> => {
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  } catch (error) {
    throw createTestError({ error, message: 'Closing the OTP test server failed' });
  }
};

try {
  // Top-level await lets Node finish registering each test before this module exits.
  await test('login OTP send accepts an existing account', async (testContext) => {
    const findUser = testContext.mock.method(User, 'exists', () => ({ _id: 'user-id' }));
    const findOtp = testContext.mock.method(otpService, 'findOtpByEmail', () => null);
    const hashOtp = testContext.mock.method(argon2, 'hash', () => 'otp-hash');
    const saveOtp = testContext.mock.method(otpService, 'saveOtpByEmail', () => undefined);
    const sendEmail = testContext.mock.method(SesCollection, 'sendEmail', () => ({
      messageId: 'ses-message-id',
    }));

    try {
      const result = await authOtpService.sendOtp({
        email: 'Existing@Example.com',
        purpose: AuthConstantsCollection.OtpPurpose.Login,
      });

      assert.deepEqual(result, { wasAlreadySent: false });
      assert.equal(findUser.mock.callCount(), 1);
      assert.deepEqual(findUser.mock.calls[0]?.arguments[0], { email: 'existing@example.com' });
      assert.equal(findOtp.mock.callCount(), 1);
      assert.equal(hashOtp.mock.callCount(), 1);
      assert.equal(saveOtp.mock.callCount(), 1);
      assert.equal(sendEmail.mock.callCount(), 1);
    } catch (error) {
      throw createTestError({ error, message: 'Eligible login OTP send failed' });
    }
  });

  await test('login OTP send rejects a missing account before OTP work or SES', async (testContext) => {
    const findUser = testContext.mock.method(User, 'exists', () => null);
    const findOtp = testContext.mock.method(otpService, 'findOtpByEmail', () => null);
    const hashOtp = testContext.mock.method(argon2, 'hash', () => 'otp-hash');
    const saveOtp = testContext.mock.method(otpService, 'saveOtpByEmail', () => undefined);
    const sendEmail = testContext.mock.method(SesCollection, 'sendEmail', () => ({
      messageId: 'ses-message-id',
    }));

    try {
      try {
        await authOtpService.sendOtp({
          email: 'Missing@Example.com',
          purpose: AuthConstantsCollection.OtpPurpose.Login,
        });
        assert.fail('Expected a missing login account to be rejected');
      } catch (error) {
        assert.ok(error instanceof ApplicationError);
        assert.equal(error.message, 'No account for this email');
        assert.equal(
          error.statusCode,
          ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
        );
      }

      assert.equal(findUser.mock.callCount(), 1);
      assert.deepEqual(findUser.mock.calls[0]?.arguments[0], { email: 'missing@example.com' });
      assert.equal(findOtp.mock.callCount(), 0);
      assert.equal(hashOtp.mock.callCount(), 0);
      assert.equal(saveOtp.mock.callCount(), 0);
      assert.equal(sendEmail.mock.callCount(), 0);
    } catch (error) {
      throw createTestError({ error, message: 'Ineligible login OTP send test failed' });
    }
  });

  await test('signup OTP send accepts an unused email', async (testContext) => {
    const findUser = testContext.mock.method(User, 'exists', () => null);
    const findOtp = testContext.mock.method(otpService, 'findOtpByEmail', () => null);
    const hashOtp = testContext.mock.method(argon2, 'hash', () => 'otp-hash');
    const saveOtp = testContext.mock.method(otpService, 'saveOtpByEmail', () => undefined);
    const sendEmail = testContext.mock.method(SesCollection, 'sendEmail', () => ({
      messageId: 'ses-message-id',
    }));

    try {
      const result = await authOtpService.sendOtp({
        email: 'New@Example.com',
        purpose: AuthConstantsCollection.OtpPurpose.Signup,
      });

      assert.deepEqual(result, { wasAlreadySent: false });
      assert.equal(findUser.mock.callCount(), 1);
      assert.deepEqual(findUser.mock.calls[0]?.arguments[0], { email: 'new@example.com' });
      assert.equal(findOtp.mock.callCount(), 1);
      assert.equal(hashOtp.mock.callCount(), 1);
      assert.equal(saveOtp.mock.callCount(), 1);
      assert.equal(sendEmail.mock.callCount(), 1);
    } catch (error) {
      throw createTestError({ error, message: 'Eligible signup OTP send failed' });
    }
  });

  await test('signup OTP send rejects an existing account before OTP work or SES', async (testContext) => {
    const findUser = testContext.mock.method(User, 'exists', () => ({ _id: 'user-id' }));
    const findOtp = testContext.mock.method(otpService, 'findOtpByEmail', () => null);
    const hashOtp = testContext.mock.method(argon2, 'hash', () => 'otp-hash');
    const saveOtp = testContext.mock.method(otpService, 'saveOtpByEmail', () => undefined);
    const sendEmail = testContext.mock.method(SesCollection, 'sendEmail', () => ({
      messageId: 'ses-message-id',
    }));

    try {
      try {
        await authOtpService.sendOtp({
          email: 'Existing@Example.com',
          purpose: AuthConstantsCollection.OtpPurpose.Signup,
        });
        assert.fail('Expected an existing signup account to be rejected');
      } catch (error) {
        assert.ok(error instanceof ApplicationError);
        assert.equal(error.message, 'Email already exists');
        assert.equal(error.statusCode, ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT);
      }

      assert.equal(findUser.mock.callCount(), 1);
      assert.deepEqual(findUser.mock.calls[0]?.arguments[0], { email: 'existing@example.com' });
      assert.equal(findOtp.mock.callCount(), 0);
      assert.equal(hashOtp.mock.callCount(), 0);
      assert.equal(saveOtp.mock.callCount(), 0);
      assert.equal(sendEmail.mock.callCount(), 0);
    } catch (error) {
      throw createTestError({ error, message: 'Ineligible signup OTP send test failed' });
    }
  });

  await test('OTP send rejects missing and unsupported purposes at the HTTP boundary', async (testContext) => {
    const sendOtp = testContext.mock.method(authOtpService, 'sendOtp', () => ({
      wasAlreadySent: false,
    }));
    testContext.mock.method(logger, 'fail', () => undefined);
    const app = express();

    app.use(express.json());
    app.post('/otp/send', authController.sendOtp);
    app.use(errorMiddleware);

    try {
      const { origin, server } = await startServer({ app });

      try {
        for (const body of [
          { email: 'person@example.com' },
          { email: 'person@example.com', purpose: 'password' },
        ]) {
          const response = await fetch(`${origin}/otp/send`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          assert.equal(response.status, 422);
          assert.equal(await response.text(), '{"message":"OTP purpose must be login or signup"}');
        }

        assert.equal(sendOtp.mock.callCount(), 0);
      } finally {
        await closeServer({ server });
      }
    } catch (error) {
      throw createTestError({ error, message: 'OTP purpose boundary validation test failed' });
    }
  });

  await test('eligible OTP send keeps an existing unexpired code', async (testContext) => {
    testContext.mock.method(User, 'exists', () => ({ _id: 'user-id' }));
    const findOtp = testContext.mock.method(otpService, 'findOtpByEmail', () => ({
      expiresAt: new Date(Date.now() + 60_000),
    }));
    const hashOtp = testContext.mock.method(argon2, 'hash', () => 'otp-hash');
    const saveOtp = testContext.mock.method(otpService, 'saveOtpByEmail', () => undefined);
    const sendEmail = testContext.mock.method(SesCollection, 'sendEmail', () => ({
      messageId: 'ses-message-id',
    }));

    try {
      const result = await authOtpService.sendOtp({
        email: 'existing@example.com',
        purpose: AuthConstantsCollection.OtpPurpose.Login,
      });

      assert.deepEqual(result, { wasAlreadySent: true });
      assert.equal(findOtp.mock.callCount(), 1);
      assert.equal(hashOtp.mock.callCount(), 0);
      assert.equal(saveOtp.mock.callCount(), 0);
      assert.equal(sendEmail.mock.callCount(), 0);
    } catch (error) {
      throw createTestError({ error, message: 'Duplicate valid OTP behavior changed' });
    }
  });
} catch (error) {
  throw createTestError({ error, message: 'Auth OTP service test registration failed' });
}
