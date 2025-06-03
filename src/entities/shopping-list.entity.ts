// src/entities/shopping-list.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { SharedList } from './shared-list.entity';
import { ShoppingListItem } from './shopping-list-item.entity'; // <--- DODAJ TEN IMPORT

@Entity()
export class ShoppingList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Usunięte: itemsSerialized i get/set items
  // @Column('text', { nullable: true })
  // itemsSerialized: string;

  @Column({ type: 'enum', enum: ['api', 'manual'], default: 'manual' })
  source: 'api' | 'manual';

  @ManyToOne(() => User, (user) => user.shoppingLists)
  user: User;

  @OneToMany(() => SharedList, (sharedList) => sharedList.shoppingList)
  sharedWith: SharedList[];

  // Nowa relacja do ShoppingListItem
  @OneToMany(() => ShoppingListItem, (item) => item.shoppingList, {
    cascade: true,
    eager: false,
  })
  items: ShoppingListItem[]; // <--- ZMIANA TUTAJ
}
