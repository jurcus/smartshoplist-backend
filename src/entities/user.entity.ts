/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { SharedList } from '../entities/shared-list.entity'; // Dodajemy import

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string; // Dodajemy nullable: true, bo hasło nie jest wymagane przy logowaniu przez Google

  @OneToMany(() => ShoppingList, (shoppingList) => shoppingList.user)
  shoppingLists: ShoppingList[];

  @OneToMany(() => SharedList, (sharedList) => sharedList.user)
  sharedLists: SharedList[]; // Dodajemy relację
}