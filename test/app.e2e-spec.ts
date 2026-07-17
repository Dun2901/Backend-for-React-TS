/// <reference types="jest" />

import { INestApplication, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('AppController HTTP smoke test', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: ['1', '2'],
    });
    app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns the standard success envelope', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({
        statusCode: 200,
        message: 'BookStore API đang hoạt động',
        data: { status: 'ok' },
      });
  });
});
