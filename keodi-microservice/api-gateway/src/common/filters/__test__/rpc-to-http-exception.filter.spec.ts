import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { TimeoutError } from 'rxjs';
import { SystemErrorMessage } from 'src/shared/constants/error.constant';
import { ConvertToHttpExceptionFilter } from '../rpc-to-http-exception.filter';

const mockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const mockHost = (res: ReturnType<typeof mockResponse>): ArgumentsHost => ({
  switchToHttp: jest.fn().mockReturnValue({
    getResponse: jest.fn().mockReturnValue(res),
  }),
  getArgs: jest.fn(),
  getArgByIndex: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
  getType: jest.fn(),
});

describe('ConvertToHttpExceptionFilter', () => {
  let filter: ConvertToHttpExceptionFilter;

  beforeEach(() => {
    filter = new ConvertToHttpExceptionFilter();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TimeoutError handling', () => {
    it('should return 504 GATEWAY_TIMEOUT for TimeoutError', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = new TimeoutError();

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.GATEWAY_TIMEOUT);
      expect(res.json).toHaveBeenCalledWith({
        status: HttpStatus.GATEWAY_TIMEOUT,
        message: SystemErrorMessage.SERVICE_REQUEST_TIMEOUT,
      });
    });
  });

  describe('exception.response handling', () => {
    it('should use statusCode and message from exception.response', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = {
        response: {
          statusCode: 404,
          message: 'Not Found',
        },
      };

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 404,
        message: 'Not Found',
      });
    });

    it('should use the first message when response.message is an array', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = {
        response: {
          statusCode: 400,
          message: ['field is required', 'another error'],
        },
      };

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        message: 'field is required',
      });
    });

    it('should handle 401 Unauthorized from exception.response', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = {
        response: {
          statusCode: 401,
          message: 'Unauthorized',
        },
      };

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 401,
        message: 'Unauthorized',
      });
    });
  });

  describe('generic object exception with status/message', () => {
    it('should use status and message fields from exception object', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = {
        status: 403,
        message: 'Forbidden',
      };

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 403,
        message: 'Forbidden',
      });
    });

    it('should include data field when exception has data', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = {
        status: 422,
        message: 'Unprocessable Entity',
        data: { field: 'value' },
      };

      filter.catch(exception, host);

      expect(res.json).toHaveBeenCalledWith({
        status: 422,
        message: 'Unprocessable Entity',
        data: { field: 'value' },
      });
    });

    it('should default to 500 and INTERNAL_SERVER_ERROR message for unknown objects without status/message', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = { stack: 'some stack', unrelated: true };

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: SystemErrorMessage.INTERNAL_SERVER_ERROR,
        }),
      );
    });
  });

  describe('unknown / primitive exceptions', () => {
    it('should default to 500 for a plain Error without status/response', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = new Error('something went wrong');

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'something went wrong',
        }),
      );
    });

    it('should not include data key when exception.data is absent', () => {
      const res = mockResponse();
      const host = mockHost(res);
      const exception = { status: 500, message: 'Internal error' };

      filter.catch(exception, host);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('data');
    });
  });
});
