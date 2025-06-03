import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'Krakowska44a',
          database: 'smart_shoplist', // Używamy istniejącej bazy
          entities: ['src/entities/*.entity.ts'],
          synchronize: true, // Uwaga: Może modyfikować schemat bazy
          logging: false, // Wyłączenie logów SQL dla czytelności
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 20000); // Timeout 20 sekund dla inicjalizacji bazy

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Czyść tabele przed każdym testem, aby uniknąć konfliktów
    const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('DELETE FROM shared_list');
    await queryRunner.query('DELETE FROM shopping_list');
    await queryRunner.query('DELETE FROM user');
    await queryRunner.release();
  });

  it('POST /users/register should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
    expect(response.body.name).toBe('Test User');
    expect(response.body.password).toBeDefined();
  });

  it('POST /users/register should return 409 if email already exists', async () => {
    // Pierwsza rejestracja
    await request(app.getHttpServer())
      .post('/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    // Powtórna rejestracja z tym samym emailem
    await request(app.getHttpServer())
      .post('/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(409);
  });
});