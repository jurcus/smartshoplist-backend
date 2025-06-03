// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'; // Dodaj ClassSerializerInterceptor
import { Reflector } from '@nestjs/core'; // Dodaj Reflector

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
  });

  // Global Pipes for Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Usuwa właściwości, które nie są zdefiniowane w DTO
      forbidNonWhitelisted: true, // Rzuca błąd, jeśli pojawią się nieznane właściwości
      transform: true, // Automatycznie transformuje payload do typów DTO
      transformOptions: {
        enableImplicitConversion: true, // Umożliwia niejawną konwersję typów
      },
    })
  );

  // Global Interceptors for Serialization (np. @Exclude() w encjach)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('SmartShopList API')
    .setDescription('API for the SmartShopList application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
