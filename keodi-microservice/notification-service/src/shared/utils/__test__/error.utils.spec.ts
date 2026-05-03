import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { handleServiceErrorCatching } from '../error.utils';

describe('handleServiceErrorCatching', () => {
  it('re-throws an existing RpcException without wrapping', () => {
    const original = new RpcException({ status: HttpStatus.NOT_FOUND, message: 'not found' });

    expect(() => handleServiceErrorCatching(original)).toThrow(original);
  });

  it('wraps a plain Error in a new RpcException with INTERNAL_SERVER_ERROR status', () => {
    const plain = new Error('something went wrong');

    expect(() => handleServiceErrorCatching(plain)).toThrow(RpcException);

    try {
      handleServiceErrorCatching(plain);
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      const rpc = err as RpcException;
      const error = rpc.getError() as { status: number; message: string };
      expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('something went wrong');
    }
  });

  it('preserves a custom HTTP status from the original error when it has a status property', () => {
    const badRequest = Object.assign(new Error('bad input'), {
      status: HttpStatus.BAD_REQUEST,
    });

    try {
      handleServiceErrorCatching(badRequest);
    } catch (err) {
      const rpc = err as RpcException;
      const error = rpc.getError() as { status: number; message: string };
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
      expect(error.message).toBe('bad input');
    }
  });

  it('falls back to INTERNAL_SERVER_ERROR when error has no status property', () => {
    const noStatus = { message: 'raw object error' };

    try {
      handleServiceErrorCatching(noStatus);
    } catch (err) {
      const rpc = err as RpcException;
      const error = rpc.getError() as { status: number; message: string };
      expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('raw object error');
    }
  });

  it('uses the error itself as the message when the error has no message property', () => {
    const noMessage = 'bare string error';

    try {
      handleServiceErrorCatching(noMessage);
    } catch (err) {
      const rpc = err as RpcException;
      const error = rpc.getError() as { status: number; message: string };
      expect(error.message).toBe('bare string error');
    }
  });

  it('always throws — never returns normally', () => {
    expect(() => handleServiceErrorCatching(new Error('any'))).toThrow();
  });
});
