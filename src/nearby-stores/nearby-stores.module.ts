import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Dodajemy ConfigModule
import { NearbyStoresService } from './nearby-stores.service';
import { NearbyStoresController } from './nearby-stores.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule, // Dodajemy ConfigModule
    TypeOrmModule.forFeature([ShoppingList]),
    forwardRef(() => ShoppingListsModule),
    PromotionsModule,
    AuthModule,
  ],
  providers: [NearbyStoresService],
  controllers: [NearbyStoresController],
  exports: [NearbyStoresService],
})
export class NearbyStoresModule {}
