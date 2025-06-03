// src/entities/user.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { SharedList } from '../entities/shared-list.entity';
import { Exclude } from 'class-transformer'; // <--- DODAJ TEN IMPORT

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Exclude() // <--- DODAJ TEN DEKORATOR
  @Column({ nullable: true })
  password: string;

  @OneToMany(() => ShoppingList, (shoppingList) => shoppingList.user)
  shoppingLists: ShoppingList[];

  @OneToMany(() => SharedList, (sharedList) => sharedList.user)
  sharedLists: SharedList[];
}
