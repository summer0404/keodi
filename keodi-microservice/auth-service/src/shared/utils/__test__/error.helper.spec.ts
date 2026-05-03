import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { handleServiceErrorCatching } from '../error.helper';

describe('handleServiceErrorCatching', () => {
  beforeEach(() => jest.clearAllMocks());

  it('re-throws an RpcException without wrapping it', () => {
    const rpcError = new RpcException({
      status: HttpStatus.BAD_REQUEST,
      message: 'some rpc error',
    });

    expect(() => handleServiceErrorCatching(rpcError)).toThrow(RpcException);
    expect(() => handleServiceErrorCatching(rpcError)).toThrow(rpcError);
  });

  it('wraps an unknown error with INTERNAL_SERVER_ERROR when no status present', () => {
    const unknownError = new Error('unexpected failure');

    expect(() => handleServiceErrorCatching(unknownError)).toThrow(
      RpcException,
    );

    try {
      handleServiceErrorCatching(unknownError);
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      const payload = (e as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe('unexpected failure');
    }
  });

  it('wraps an error object that has a status property', () => {
    const errorWithStatus = { status: HttpStatus.FORBIDDEN, message: 'forbidden resource' };

    try {
      handleServiceErrorCatching(errorWithStatus);
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      const payload = (e as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.FORBIDDEN);
      expect(payload.message).toBe('forbidden resource');
    }
  });

  it('uses INTERNAL_SERVER_ERROR when wrapped error has no status', () => {
    const plain = { message: 'no status here' };

    try {
      handleServiceErrorCatching(plain);
    } catch (e) {
      const payload = (e as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  });

  it('handles error where message is the error itself (non-Error object)', () => {
    const primitive = 'string error';

    try {
      handleServiceErrorCatching(primitive);
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      const payload = (e as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe('string error');
    }
  });

  it('always throws — never returns normally', () => {
    const rpc = new RpcException({ status: 400, message: 'err' });
    expect(() => handleServiceErrorCatching(rpc)).toThrow();
  });
});
