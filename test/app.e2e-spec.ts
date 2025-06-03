// test/app.e2e-spec.ts
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
          // Użyj konfiguracji testowej bazy danych
          type: 'mysql',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '3306', 10),
          username: process.env.TEST_DB_USERNAME || 'root',
          password: process.env.TEST_DB_PASSWORD || 'Krakowska44a',
          database: process.env.TEST_DB_DATABASE || 'smart_shoplist_test', // Idealnie inna baza danych do testów
          entities: ['src/entities/*.entity.ts'], // Upewnij się, że ścieżka jest poprawna
          synchronize: true,
          logging: false,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 20000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    // Kolejność usuwania jest ważna ze względu na klucze obce
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;'); // Wyłącz sprawdzanie kluczy obcych na czas czyszczenia
    await queryRunner.query('DELETE FROM `shared_list`;'); // Użyj backticków, jeśli nazwa tabeli jest słowem kluczowym
    await queryRunner.query('DELETE FROM `shopping_list_item`;'); // <--- DODAJ CZYSZCZENIE NOWEJ TABELI
    await queryRunner.query('DELETE FROM `shopping_list`;');
    await queryRunner.query('DELETE FROM `user`;');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;'); // Włącz z powrotem sprawdzanie kluczy obcych
    await queryRunner.release();
  });

  it('POST /users/register should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/register') // Upewnij się, że endpoint jest zgodny z globalnym prefixem /api (jeśli jest stosowany w testach)
      // Jeśli prefix jest globalny, powinno być /api/users/register
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    // Sprawdź, czy pozostałe pola są zwracane zgodnie z oczekiwaniami (bez hasła)
    // UsersService.register zwraca cały obiekt użytkownika,
    // ClassSerializerInterceptor powinien usunąć hasło
    // Zakładając, że register zwraca { id, email, name }
    expect(response.body.email).toBe('test@example.com');
    expect(response.body.name).toBe('Test User');
    expect(response.body.password).toBeUndefined(); // Hasło nie powinno być zwracane
  });

  it('POST /users/register should return 409 if email already exists', async () => {
    await request(app.getHttpServer())
      .post('/users/register') // Zastosuj /api jeśli trzeba
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/users/register') // Zastosuj /api jeśli trzeba
      .send({
        name: 'Test User 2',
        email: 'test@example.com', // Ten sam email
        password: 'password456',
      })
      .expect(409); // UsersService.register rzuca ConflictException
  });
});
