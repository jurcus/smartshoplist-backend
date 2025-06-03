// src/entities/shopping-list-item.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ShoppingList } from './shopping-list.entity';

@Entity()
export class ShoppingListItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: '' })
  category: string;

  @Column({ default: '' })
  store: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ default: false })
  bought: boolean;

  @ManyToOne(() => ShoppingList, (shoppingList) => shoppingList.items, {
    onDelete: 'CASCADE',
  })
  shoppingList: ShoppingList;
}
