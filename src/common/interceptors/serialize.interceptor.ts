import { CallHandler, ExecutionContext, NestInterceptor, UseInterceptors } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { map, Observable } from 'rxjs';

interface ClassConstructor {
  new (...args: any[]): object;
}

interface IModelPaginate {
  meta: {
    current: number;
    pageSize: number;
    pages: number;
    total: number;
  };
  result: unknown[];
}

const transformOptions = {
  excludeExtraneousValues: true,
  enableImplicitConversion: true,
};

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}
export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: ClassConstructor) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (this.isPaginated(data)) {
          return {
            meta: data.meta,
            result: plainToInstance(this.dto, data.result, transformOptions),
          };
        }

        return plainToInstance(this.dto, data, transformOptions);
      }),
    );
  }

  private isPaginated(data: unknown): data is IModelPaginate {
    if (typeof data !== 'object' || data === null) return false;
    const response = data as IModelPaginate;
    return response.meta !== undefined && Array.isArray(response.result);
  }
}
