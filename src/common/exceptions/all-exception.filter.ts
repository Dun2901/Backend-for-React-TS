import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

interface HttpExceptionResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

export const getStatusCode = <T>(exception: T): number => {
  return exception instanceof HttpException
    ? exception.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;
};

export const getErrorMessage = <T>(exception: T): string | string[] => {
  if (exception instanceof HttpException) {
    const errorResponse = exception.getResponse();
    const errorMessage = (errorResponse as HttpExceptionResponse).message || exception.message;

    return errorMessage;
  } else {
    return String(exception);
  }
};

@Catch()
export class GlobalExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = getStatusCode<T>(exception);
    const message = getErrorMessage<T>(exception);

    response.status(statusCode).json({
      error: {
        timestamp: new Date().toISOString(),
        path: request.url,
        statusCode,
        message,
      },
    });
  }
}
