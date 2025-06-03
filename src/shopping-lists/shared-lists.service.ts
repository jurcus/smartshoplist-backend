import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedList } from '../entities/shared-list.entity';
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class SharedListsService {
  constructor(
    @InjectRepository(SharedList)
    private sharedListsRepository: Repository<SharedList>,
    @InjectRepository(ShoppingList)
    private shoppingListsRepository: Repository<ShoppingList>,
    private usersService: UsersService
  ) {}

  async shareList(owner: User, listId: number, email: string): Promise<void> {
    // Znajdź listę zakupów
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id: listId, user: { id: owner.id } },
      relations: ['user'],
    });
    if (!shoppingList) {
      throw new NotFoundException(
        'Shopping list not found or you are not the owner'
      );
    }

    // Znajdź użytkownika, которому udostępniamy listę
    const userToShare = await this.usersService.findByEmail(email);
    if (!userToShare) {
      throw new NotFoundException('User with this email not found');
    }

    // Sprawdź, czy użytkownik nie jest już na liście udostępnionych
    const existingShare = await this.sharedListsRepository.findOne({
      where: { shoppingListId: listId, userId: userToShare.id },
    });
    if (existingShare) {
      throw new ForbiddenException(
        'This user already has access to the shopping list'
      );
    }

    // Utwórz rekord udostępnienia
    const sharedList = this.sharedListsRepository.create({
      shoppingList,
      shoppingListId: listId,
      user: userToShare,
      userId: userToShare.id,
      owner,
      ownerId: owner.id,
    });

    await this.sharedListsRepository.save(sharedList);
  }

  async getSharedLists(user: User): Promise<ShoppingList[]> {
    const sharedLists = await this.sharedListsRepository.find({
      where: { userId: user.id },
      relations: ['shoppingList'],
    });

    return sharedLists.map((sharedList) => sharedList.shoppingList);
  }

  async removeSharedAccess(
    owner: User,
    listId: number,
    userId: number
  ): Promise<void> {
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id: listId, user: { id: owner.id } },
    });
    if (!shoppingList) {
      throw new NotFoundException(
        'Shopping list not found or you are not the owner'
      );
    }

    const sharedList = await this.sharedListsRepository.findOne({
      where: { shoppingListId: listId, userId },
    });
    if (!sharedList) {
      throw new NotFoundException(
        'This user does not have access to the shopping list'
      );
    }

    await this.sharedListsRepository.remove(sharedList);
  }
}
