import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { INTERNAL_SERVER_ERROR } from '../../constants/error.constant';
import { handleServiceErrorCatching } from '../error.utils';

describe('handleServiceErrorCatching', () => {
  it('re-throws an existing RpcException without wrapping', () => {
    const original = new RpcException({ status: HttpStatus.NOT_FOUND, message: 'not found' });

    expect(() => handleServiceErrorCatching(original)).toThrow(original);
  });

  it('wraps a plain Error in a new RpcException with INTERNAL_SERVER_ERROR', () => {
    const plain = new Error('Can\'t reach database server at 127.0.0.1:5432');

    expect(() => handleServiceErrorCatching(plain)).toThrow(RpcException);

    try {
      handleServiceErrorCatching(plain);
    } catch (err) {
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('does not expose the original error message for non-RpcException errors', () => {
    const internalError = new Error('internal db failure details');

    try {
      handleServiceErrorCatching(internalError);
    } catch (err) {
      const payload = (err as RpcException).getError() as any;
      expect(payload.message).not.toBe(internalError.message);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('always uses INTERNAL_SERVER_ERROR status regardless of error.status', () => {
    const badRequest = Object.assign(new Error('bad input'), {
      status: HttpStatus.BAD_REQUEST,
    });

    try {
      handleServiceErrorCatching(badRequest);
    } catch (err) {
      const payload = (err as RpcException).getError() as any;
      expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(payload.message).toBe(INTERNAL_SERVER_ERROR);
    }
  });

  it('always throws — never returns normally', () => {
    expect(() => handleServiceErrorCatching(new Error('any'))).toThrow();
  });
});
