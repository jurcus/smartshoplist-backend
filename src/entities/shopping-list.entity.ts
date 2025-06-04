// src/entities/shopping-list.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn, // <-- DODAJ IMPORT
  UpdateDateColumn, // <-- DODAJ IMPORT
} from 'typeorm';
import { User } from './user.entity';
import { SharedList } from './shared-list.entity';
import { ShoppingListItem } from './shopping-list-item.entity';

@Entity()
export class ShoppingList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['api', 'manual'], default: 'manual' })
  source: 'api' | 'manual';

  @Column({ default: false }) // <-- NOWE POLE
  isFavorite: boolean;

  @CreateDateColumn() // <-- NOWE POLE (automatycznie zarządzane przez TypeORM)
  createdAt: Date;

  @UpdateDateColumn() // <-- NOWE POLE (automatycznie zarządzane przez TypeORM)
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.shoppingLists)
  user: User;

  @OneToMany(() => SharedList, (sharedList) => sharedList.shoppingList, { cascade: true }) // Dodano cascade dla SharedList
  sharedWith: SharedList[];

  @OneToMany(() => ShoppingListItem, (item) => item.shoppingList, { cascade: true })
  items: ShoppingListItem[];
}