import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { INTERNAL_SERVER_ERROR } from '../../constants/error.constant';
import { handleServiceErrorCatching } from '../error.helper';

describe('handleServiceErrorCatching', () => {
  beforeEach(() => jest.clearAllMocks());

  it('re-throws an RpcException without wrapping it', () => {
    const rpcError = new RpcException({
      status: HttpStatus.BAD_REQUEST,
      message: 'some rpc error',
    });

    expect(() => handleServiceErrorCatching(rpcError)).toThrow(rpcError);
  });

  it('wraps an unknown error with INTERNAL_SERVER_ERROR and sanitized message', () => {
    const unknownError = new Error('Can\'t reach database server at 127.0.0.1:5432');

    try {
      handleServiceErrorCatching(unknownError);
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      const payload = (e as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('does not expose the original error message for non-RpcException errors', () => {
    const internalError = new Error('prisma: invalid field xyz');

    try {
      handleServiceErrorCatching(internalError);
    } catch (e) {
      const payload = (e as RpcException).getError() as any;
      expect(payload.message).not.toBe(internalError.message);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('always uses INTERNAL_SERVER_ERROR regardless of error.status', () => {
    const errorWithStatus = { status: HttpStatus.FORBIDDEN, message: 'forbidden resource' };

    try {
      handleServiceErrorCatching(errorWithStatus);
    } catch (e) {
      const payload = (e as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('always throws — never returns normally', () => {
    expect(() => handleServiceErrorCatching(new RpcException({ status: 400, message: 'err' }))).toThrow();
  });
});
