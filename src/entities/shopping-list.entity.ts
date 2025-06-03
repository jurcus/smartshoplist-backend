import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../entities/user.entity';
import { SharedList } from '../entities/shared-list.entity';

@Entity()
export class ShoppingList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  itemsSerialized: string;

  @Column({ type: 'enum', enum: ['api', 'manual'], default: 'manual' })
  source: 'api' | 'manual';

  @ManyToOne(() => User, (user) => user.shoppingLists)
  user: User;

  @OneToMany(() => SharedList, (sharedList) => sharedList.shoppingList)
  sharedWith: SharedList[];

  get items(): { name: string; category: string; store: string; quantity: number; bought: boolean }[] {
    return this.itemsSerialized ? JSON.parse(this.itemsSerialized) : [];
  }

  set items(value: { name: string; category: string; store: string; quantity: number; bought: boolean }[]) {
    this.itemsSerialized = JSON.stringify(value);
  }
}