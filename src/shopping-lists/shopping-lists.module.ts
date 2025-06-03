/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { SharedListsService } from './shared-lists.service'; // Dodajemy import
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { SharedList } from '../entities/shared-list.entity'; // Dodajemy import
import { AuthModule } from '../auth/auth.module';
import { UsersService } from '../users/users.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { NearbyStoresModule } from '../nearby-stores/nearby-stores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingList, User, SharedList]), // Dodajemy SharedList
    AuthModule,
    PromotionsModule,
    forwardRef(() => NearbyStoresModule),
  ],
  controllers: [ShoppingListsController],
  providers: [ShoppingListsService, SharedListsService, UsersService], // Dodajemy SharedListsService
  exports: [ShoppingListsService],
})
export class ShoppingListsModule {}