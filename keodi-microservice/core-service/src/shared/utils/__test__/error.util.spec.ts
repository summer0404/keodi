import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { INTERNAL_SERVER_ERROR } from '../../constants/error.constant';
import { handleServiceErrorCatching } from '../error.util';

describe('handleServiceErrorCatching', () => {
  beforeEach(() => jest.clearAllMocks());

  it('re-throws RpcException as-is', () => {
    const rpcError = new RpcException({
      status: HttpStatus.NOT_FOUND,
      message: 'Not found',
    });

    expect(() => handleServiceErrorCatching(rpcError)).toThrow(rpcError);
  });

  it('wraps an unknown Error with INTERNAL_SERVER_ERROR status and sanitized message', () => {
    const genericError = new Error(
      "Can't reach database server at 127.0.0.1:5432",
    );

    try {
      handleServiceErrorCatching(genericError);
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('does not expose the original error message for unknown errors', () => {
    const prismaError = new Error(
      'Invalid prisma invocation: field xyz not found',
    );

    try {
      handleServiceErrorCatching(prismaError);
    } catch (err) {
      const payload = (err as RpcException).getError() as any;
      expect(payload.message).not.toBe(prismaError.message);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('always uses INTERNAL_SERVER_ERROR status for non-RpcException errors regardless of error.status', () => {
    const errorWithStatus = {
      status: HttpStatus.BAD_REQUEST,
      message: 'Bad request data',
    };

    try {
      handleServiceErrorCatching(errorWithStatus);
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('handles string-like errors without exposing them', () => {
    try {
      handleServiceErrorCatching('raw string error');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('always throws, never returns normally', () => {
    expect(() => handleServiceErrorCatching(new Error('test'))).toThrow();
  });
});
