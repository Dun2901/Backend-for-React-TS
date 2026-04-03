// Source - https://stackoverflow.com/a/60195396
// Posted by Jackie McDoniel, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-04, License - CC BY-SA 4.0

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message?: string;
  data: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        // message: data.message,
        data: data,
      })),
    );
  }
}
