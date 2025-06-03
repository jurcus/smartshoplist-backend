// src/shopping-lists/shopping-lists.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { SharedListsService } from './shared-lists.service';
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { SharedList } from '../entities/shared-list.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity'; // <--- DODAJ TEN IMPORT
import { AuthModule } from '../auth/auth.module';
import { UsersService } from '../users/users.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { NearbyStoresModule } from '../nearby-stores/nearby-stores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShoppingList,
      User,
      SharedList,
      ShoppingListItem,
    ]), // <--- ZMIANA TUTAJ
    AuthModule,
    PromotionsModule,
    forwardRef(() => NearbyStoresModule),
  ],
  controllers: [ShoppingListsController],
  providers: [ShoppingListsService, SharedListsService, UsersService],
  exports: [ShoppingListsService],
})
export class ShoppingListsModule {}
