import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ShoppingList } from './shopping-list.entity';
import { User } from './user.entity';

@Entity()
export class SharedList {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ShoppingList, (shoppingList) => shoppingList.sharedWith, {
    onDelete: 'CASCADE',
  })
  shoppingList: ShoppingList;

  @Column()
  shoppingListId: number;

  @ManyToOne(() => User, (user) => user.sharedLists, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @Column()
  ownerId: number;
}
