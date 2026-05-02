import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { handleServiceErrorCatching } from '../error.util';

describe('handleServiceErrorCatching', () => {
  beforeEach(() => jest.clearAllMocks());

  it('re-throws RpcException as-is', () => {
    const rpcError = new RpcException({ status: HttpStatus.NOT_FOUND, message: 'Not found' });

    expect(() => handleServiceErrorCatching(rpcError)).toThrow(RpcException);
    expect(() => handleServiceErrorCatching(rpcError)).toThrow(rpcError);
  });

  it('wraps an unknown Error with INTERNAL_SERVER_ERROR status', () => {
    const genericError = new Error('something went wrong');

    try {
      handleServiceErrorCatching(genericError);
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe('something went wrong');
    }
  });

  it('wraps an error that has a custom status code', () => {
    const httpError = { status: HttpStatus.BAD_REQUEST, message: 'Bad request data' };

    try {
      handleServiceErrorCatching(httpError);
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
      expect(payload.message).toBe('Bad request data');
    }
  });

  it('uses INTERNAL_SERVER_ERROR when error has no status', () => {
    const plainError = { message: 'no status here' };

    try {
      handleServiceErrorCatching(plainError);
    } catch (err) {
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  });

  it('handles a non-Error object thrown as a string-like message', () => {
    const stringLike = 'raw string error';

    try {
      handleServiceErrorCatching(stringLike);
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe('raw string error');
    }
  });

  it('always throws, never returns normally', () => {
    const err = new Error('test');
    expect(() => handleServiceErrorCatching(err)).toThrow();
  });
});
