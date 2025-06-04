// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ShoppingList } from './entities/shopping-list.entity';
import { SharedList } from './entities/shared-list.entity';
import { ShoppingListItem } from './entities/shopping-list-item.entity';
import { PromotionsModule } from './promotions/promotions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShoppingListsModule } from './shopping-lists/shopping-lists.module';
import { NearbyStoresModule } from './nearby-stores/nearby-stores.module';
import { ReceiptProcessingModule } from './receipt-processing/receipt-processing.module';
import * as Joi from 'joi'; // <--- DODAJ TEN IMPORT

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Dodajemy schemat walidacji dla zmiennych środowiskowych
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DB_TYPE: Joi.string().default('mysql'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required().allow(''), // Pozwól na puste hasło, jeśli tak jest skonfigurowane lokalnie
        DB_DATABASE: Joi.string().required(),
        DB_SYNCHRONIZE: Joi.boolean().default(false), // Domyślnie false dla bezpieczeństwa
        JWT_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),
        GOOGLE_MAPS_API_KEY: Joi.string().required(), // <--- WALIDACJA DLA Maps_API_KEY
      }),
      validationOptions: {
        allowUnknown: true, // Pozwala na inne zmienne środowiskowe, które nie są w schemacie
        abortEarly: false, // Wyświetla wszystkie błędy walidacji naraz
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Nie ma już potrzeby rzucania błędu dla DB_PORT tutaj, ConfigModule to obsłuży
        // const port = configService.get<number>('DB_PORT');
        // if (!port) {
        //   throw new Error('DB_PORT is not defined in .env');
        // }
        return {
          type: configService.get<string>('DB_TYPE') as 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'), // Joi zapewni, że to jest liczba
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [User, ShoppingList, SharedList, ShoppingListItem],
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE'), // Joi zapewni, że to jest boolean
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PromotionsModule,
    ShoppingListsModule,
    NearbyStoresModule,
    ReceiptProcessingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
