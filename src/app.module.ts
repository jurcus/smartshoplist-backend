/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ShoppingList } from './entities/shopping-list.entity';
import { SharedList } from './entities/shared-list.entity'; // Dodajemy import
import { PromotionsModule } from './promotions/promotions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShoppingListsModule } from './shopping-lists/shopping-lists.module';
import { NearbyStoresModule } from './nearby-stores/nearby-stores.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const port = configService.get<number>('DB_PORT');
        if (!port) {
          throw new Error('DB_PORT is not defined in .env');
        }
        return {
          type: configService.get<string>('DB_TYPE') as 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: +port,
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [User, ShoppingList, SharedList], // Dodajemy SharedList
          synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PromotionsModule,
    ShoppingListsModule,
    NearbyStoresModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}