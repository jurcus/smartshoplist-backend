// src/shopping-lists/shopping-lists.service.ts
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindManyOptions, FindOptionsWhere } from 'typeorm'; // Dodano FindManyOptions, FindOptionsWhere
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { NearbyStoresService } from '../nearby-stores/nearby-stores.service';
import { SharedListsService } from './shared-lists.service';
import axios from 'axios';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ShoppingListItemInputDto } from './dto/shopping-list-item-input.dto';

// Definicja dla filtrów i sortowania w findAll
export interface FindAllShoppingListsOptions {
  isFavorite?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'isFavorite';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ShoppingListsService {
  constructor(
    @InjectRepository(ShoppingList)
    private shoppingListsRepository: Repository<ShoppingList>,
    @InjectRepository(ShoppingListItem)
    private shoppingListItemRepository: Repository<ShoppingListItem>,
    private promotionsService: PromotionsService,
    private nearbyStoresService: NearbyStoresService,
    private sharedListsService: SharedListsService,
    private dataSource: DataSource,
  ) {}

  // Zmieniamy typ rawItems, aby odzwierciedlał dane wejściowe z create/update listy
  // ShoppingListItemInputDto ma `name: string` (nieopcjonalne)
  // AddItemDto (używane w createFromApi) również ma `name: string` (nieopcjonalne)
  private _normalizeAndCreateItemEntities(rawItems: (string | ShoppingListItemInputDto | AddItemDto)[]): ShoppingListItem[] {
    return (rawItems || []).map((itemInput) => {
      const newItem = this.shoppingListItemRepository.create();
      if (typeof itemInput === 'string') {
        newItem.name = itemInput;
        newItem.category = '';
        newItem.store = '';
        newItem.quantity = 1;
        newItem.bought = false;
      } else {
        // Tutaj itemInput to ShoppingListItemInputDto lub AddItemDto
        newItem.name = itemInput.name; // name jest teraz na pewno stringiem
        newItem.category = itemInput.category || '';
        newItem.store = itemInput.store || '';
        newItem.quantity = itemInput.quantity === undefined ? 1 : itemInput.quantity;
        
        // Sprawdzamy 'bought' - AddItemDto ma je opcjonalne, ShoppingListItemInputDto też.
        // Encja ShoppingListItem ma default false.
        if (typeof itemInput.bought === 'boolean') {
          newItem.bought = itemInput.bought;
        } else {
          newItem.bought = false; 
        }
      }
      return newItem;
    });
  }

  private async transformShoppingListWithPromotions(list: ShoppingList): Promise<any> {
    const itemsToProcess = list.items || [];
    try {
      const promotionCheckPayload = itemsToProcess.map(item => ({ name: item.name, category: item.category }));
      const itemsWithPromotionsData = await this.promotionsService.getPromotionsForList(promotionCheckPayload);
      
      const hydratedItems = itemsToProcess.map(itemEntity => {
        const promotionData = itemsWithPromotionsData.find(
          pItem => pItem.name === itemEntity.name && pItem.category === itemEntity.category
        );
        return {
          ...itemEntity,
          promotions: promotionData ? promotionData.promotions : [],
        };
      });
      return { ...list, items: hydratedItems };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Błąd podczas pobierania promocji dla listy ${list.name}:`, errorMessage);
      return { ...list, items: itemsToProcess.map(item => ({ ...item, promotions: [] })) };
    }
  }

  async create(user: User, createShoppingListDto: CreateShoppingListDto): Promise<any> {
    const shoppingList = this.shoppingListsRepository.create({
      name: createShoppingListDto.name,
      user,
      source: 'manual',
      isFavorite: false,
    });
    // createShoppingListDto.items to (string | ShoppingListItemInputDto)[] | undefined
    // To jest kompatybilne z (string | ShoppingListItemInputDto | AddItemDto)[]
    shoppingList.items = this._normalizeAndCreateItemEntities(createShoppingListDto.items || []);
    const savedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(savedList);
  }
  
  async toggleFavorite(userId: number, listId: number, isFavorite: boolean): Promise<ShoppingList> {
    const list = await this.shoppingListsRepository.findOne({
      where: { id: listId, user: { id: userId } },
      relations: ['user', 'items', 'sharedWith', 'sharedWith.user'],
    });

    if (!list) {
      throw new NotFoundException(`Shopping list with ID ${listId} not found or you are not the owner.`);
    }

    list.isFavorite = isFavorite;
    await this.shoppingListsRepository.save(list);
    return list;
  }

  async createFromApi(user: User): Promise<any> {
    const response = await axios.get('https://fakestoreapi.com/products');
    const products = response.data.slice(0, 5);
    const rawItemsForNormalization: AddItemDto[] = products.map((product: any) => ({ // Używamy AddItemDto, który ma name jako string
      name: product.title,
      category: product.category,
      store: 'Fake Store',
      quantity: 1,
      bought: false, // AddItemDto ma opcjonalne bought, więc tu ustawiamy jawnie
    }));

    const shoppingList = this.shoppingListsRepository.create({
      name: 'Lista z Fake Store',
      user,
      source: 'api',
      isFavorite: false,
    });
    shoppingList.items = this._normalizeAndCreateItemEntities(rawItemsForNormalization);
    const savedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(savedList);
  }

  async findAll(user: User, options?: FindAllShoppingListsOptions): Promise<any[]> {
    const whereClause: FindOptionsWhere<ShoppingList> = { user: { id: user.id } };
    const orderClause: FindManyOptions<ShoppingList>['order'] = {};

    if (options?.isFavorite !== undefined) {
      whereClause.isFavorite = options.isFavorite;
    }

    if (options?.sortBy && options?.sortOrder) {
      orderClause[options.sortBy] = options.sortOrder;
    } else {
        orderClause.createdAt = 'DESC';
    }

    const findOptions: FindManyOptions<ShoppingList> = {
        where: whereClause,
        relations: ['items', 'user', 'sharedWith', 'sharedWith.user'],
        order: orderClause,
    };
    
    const ownLists = await this.shoppingListsRepository.find(findOptions);
    
    const sharedListEntities = await this.sharedListsService.getSharedLists(user);
    const sharedListsDetails = await Promise.all(
        (sharedListEntities || []).map(async sl => {
            // Przygotuj warunki wyszukiwania dla udostępnionych list, jeśli są filtry/sortowanie
            const sharedWhere: FindOptionsWhere<ShoppingList> = { id: sl.id };
            if (options?.isFavorite !== undefined) {
              // Ulubione jest cechą listy właściciela, więc nie filtrujemy tu, chyba że logika biznesowa tego wymaga inaczej
              // sharedWhere.isFavorite = options.isFavorite;
            }

            return this.shoppingListsRepository.findOne({
              where: sharedWhere,
              relations: ['items', 'user', 'sharedWith', 'sharedWith.user'],
              // order: orderClause, // Można dodać sortowanie, jeśli jest potrzebne spójne dla wszystkich
            });
        }
      )
    );
    
    let allLists = [...ownLists, ...sharedListsDetails.filter(list => list !== null)] as ShoppingList[];

    // Jeśli sortowanie nie zostało w pełni zastosowane na poziomie DB dla połączonych list,
    // można je wykonać tutaj na całej tablicy 'allLists' przed transformacją.
    // Na przykład, jeśli sortOrder i sortBy są zdefiniowane:
    if (options?.sortBy && options?.sortOrder) {
        allLists.sort((a, b) => {
            const valA = a[options.sortBy!]; // Dodano ! bo wiemy, że sortBy jest zdefiniowane
            const valB = b[options.sortBy!];

            if (typeof valA === 'number' && typeof valB === 'number') {
                return options.sortOrder === 'ASC' ? valA - valB : valB - valA;
            }
            if (typeof valA === 'boolean' && typeof valB === 'boolean') {
                 // false (0) < true (1)
                const boolA = valA ? 1 : 0;
                const boolB = valB ? 1 : 0;
                return options.sortOrder === 'ASC' ? boolA - boolB : boolB - boolA;
            }
            // Domyślnie sortuj jako stringi lub daty
            if (valA < valB) return options.sortOrder === 'ASC' ? -1 : 1;
            if (valA > valB) return options.sortOrder === 'ASC' ? 1 : -1;
            return 0;
        });
    }


    return Promise.all(allLists.map((list) => this.transformShoppingListWithPromotions(list)));
  }

  async findOne(user: User, listId: number): Promise<any> {
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id: listId },
      relations: ['user', 'items', 'sharedWith', 'sharedWith.user'],
    });
    if (!shoppingList) {
      throw new NotFoundException('Lista zakupów nie została znaleziona');
    }
    const isOwner = shoppingList.user.id === user.id;
    const isShared = shoppingList.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) {
      throw new UnauthorizedException('You do not have permission to access this shopping list');
    }
    return this.transformShoppingListWithPromotions(shoppingList);
  }

  async addItem(user: User, listId: number, addItemDto: AddItemDto): Promise<any> {
    const shoppingListEntity = await this.shoppingListsRepository.findOne({
        where: { id: listId },
        relations: ['user', 'sharedWith'] 
    });
    if (!shoppingListEntity) throw new NotFoundException('Lista zakupów nie została znaleziona');

    const isOwner = shoppingListEntity.user.id === user.id;
    const isShared = shoppingListEntity.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) throw new UnauthorizedException('Nie masz uprawnień do modyfikacji tej listy zakupów');

    const newItemEntity = this.shoppingListItemRepository.create({
      name: addItemDto.name,
      category: addItemDto.category || '',
      store: addItemDto.store || '',
      quantity: addItemDto.quantity === undefined ? 1 : addItemDto.quantity,
      bought: addItemDto.bought ?? false, 
      shoppingList: shoppingListEntity,
    });
    await this.shoppingListItemRepository.save(newItemEntity);
    const updatedList = await this.shoppingListsRepository.findOne({
        where: {id: listId},
        relations: ['user', 'items', 'sharedWith', 'sharedWith.user']
    });
    if (!updatedList) throw new InternalServerErrorException('Nie udało się odświeżyć listy po dodaniu elementu');
    return this.transformShoppingListWithPromotions(updatedList);
  }

  async updateItemById(
    user: User,
    listId: number,
    itemId: number,
    updateItemDto: UpdateItemDto,
  ): Promise<any> {
    const shoppingListEntity = await this.shoppingListsRepository.findOne({
        where: { id: listId },
        relations: ['user', 'sharedWith']
    });
    if (!shoppingListEntity) throw new NotFoundException('Lista zakupów nie została znaleziona');

    const isOwner = shoppingListEntity.user.id === user.id;
    const isShared = shoppingListEntity.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) throw new UnauthorizedException('Nie masz uprawnień do modyfikacji tej listy zakupów');

    const itemToUpdate = await this.shoppingListItemRepository.findOne({
      where: { id: itemId, shoppingList: { id: listId } }
    });
    if (!itemToUpdate) throw new NotFoundException(`Item with ID ${itemId} not found in list ${listId}`);
    
    Object.assign(itemToUpdate, updateItemDto);

    await this.shoppingListItemRepository.save(itemToUpdate);
    const updatedList = await this.shoppingListsRepository.findOne({
        where: {id: listId},
        relations: ['user', 'items', 'sharedWith', 'sharedWith.user']
    });
    if (!updatedList) throw new InternalServerErrorException('Nie udało się odświeżyć listy po aktualizacji elementu');
    return this.transformShoppingListWithPromotions(updatedList);
  }

  async deleteItemFromList(user: User, listId: number, itemId: number): Promise<void> {
    const shoppingListEntity = await this.shoppingListsRepository.findOne({
      where: { id: listId },
      relations: ['user', 'sharedWith'],
    });
    if (!shoppingListEntity) throw new NotFoundException(`Shopping list with ID ${listId} not found.`);
    const isOwner = shoppingListEntity.user.id === user.id;
    const isSharedWithRights = shoppingListEntity.sharedWith?.some(
      (shared) => shared.userId === user.id
    );
    if (!isOwner && !isSharedWithRights) {
      throw new UnauthorizedException('You do not have permission to modify this shopping list.');
    }
    const itemToDelete = await this.shoppingListItemRepository.findOne({
      where: { id: itemId, shoppingList: { id: listId } },
    });
    if (!itemToDelete) {
      throw new NotFoundException(`Item with ID ${itemId} not found in shopping list ${listId}.`);
    }
    await this.shoppingListItemRepository.remove(itemToDelete);
  }

  async update(user: User, listId: number, updateShoppingListDto: UpdateShoppingListDto): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let shoppingList = await queryRunner.manager.findOne(ShoppingList, {
        where: { id: listId },
        relations: ['user', 'items', 'sharedWith'],
      });
      if (!shoppingList) throw new NotFoundException('Lista zakupów nie została znaleziona');

      const isOwner = shoppingList.user.id === user.id;
      const isShared = shoppingList.sharedWith?.some((shared) => shared.userId === user.id);
      if (!isOwner && !isShared) throw new UnauthorizedException('Nie masz uprawnień do modyfikacji tej listy zakupów');

      shoppingList.name = updateShoppingListDto.name;
      // Dodajemy obsługę isFavorite, jeśli jest w DTO
      if (updateShoppingListDto.isFavorite !== undefined) {
        shoppingList.isFavorite = updateShoppingListDto.isFavorite;
      }
      
      if (shoppingList.items && shoppingList.items.length > 0) {
        await queryRunner.manager.remove(shoppingList.items);
      }
      
      const newItemEntities = this._normalizeAndCreateItemEntities(updateShoppingListDto.items || []);
      shoppingList.items = newItemEntities; 
      
      await queryRunner.manager.save(shoppingList);
      
      await queryRunner.commitTransaction();

      const reloadedList = await this.shoppingListsRepository.findOne({
          where: {id: listId},
          relations: ['user', 'items', 'sharedWith', 'sharedWith.user']
      });
      if (!reloadedList) throw new InternalServerErrorException('Nie udało się odświeżyć listy po aktualizacji');
      return this.transformShoppingListWithPromotions(reloadedList);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during update';
      console.error("Błąd podczas aktualizacji listy zakupów:", errorMessage, err);
      if (err instanceof NotFoundException || err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Wystąpił błąd podczas aktualizacji listy zakupów.');
    } finally {
      await queryRunner.release();
    }
  }

  async searchItems(
    user: User,
    query: { name?: string; category?: string; store?: string },
  ): Promise<{ listId: number; listName: string; items: any[] }[]> {
    const ownLists = await this.shoppingListsRepository.find({
      where: { user: { id: user.id } },
      relations: ['items', 'user'],
    });
    const sharedListEntities = await this.sharedListsService.getSharedLists(user);
    const sharedListsData = await Promise.all(
      (sharedListEntities || []).map(sl =>
        this.shoppingListsRepository.findOne({
          where: { id: sl.id },
          relations: ['items', 'user', 'sharedWith', 'sharedWith.user']
        })
      )
    );
    const allLists = [...ownLists, ...sharedListsData.filter(list => list !== null)] as ShoppingList[];

    const results = await Promise.all(
      allLists.map(async (list) => {
        const filteredItems = (list.items || []).filter((item: ShoppingListItem) => {
          const matchesName = query.name ? (item.name || '').toLowerCase().includes(query.name.toLowerCase()) : true;
          const matchesCategory = query.category ? (item.category || '').toLowerCase() === query.category.toLowerCase() : true;
          const matchesStore = query.store ? (item.store || '').toLowerCase() === query.store.toLowerCase() : true;
          return matchesName && matchesCategory && matchesStore;
        });
        const itemsForPromoCheck = filteredItems.map(item => ({ name: item.name, category: item.category }));
        try {
          const itemsWithPromotionsDetails = await this.promotionsService.getPromotionsForList(itemsForPromoCheck);
          const finalFilteredItems = filteredItems.map(item => {
            const promoDetail = itemsWithPromotionsDetails.find(p => p.name === item.name && p.category === item.category);
            return { ...item, promotions: promoDetail ? promoDetail.promotions : [] };
          });
          return { listId: list.id, listName: list.name, items: finalFilteredItems };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Błąd podczas pobierania promocji dla wyszukiwanych itemów z listy ${list.name}:`, errorMessage);
          return { listId: list.id, listName: list.name, items: filteredItems.map(item => ({ ...item, promotions: [] })) };
        }
      }),
    );
    return results.filter((result) => result.items.length > 0);
  }

  async remove(user: User, id: number): Promise<void> {
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id },
      relations: ['user', 'sharedWith'],
    });
    if (!shoppingList) {
      throw new NotFoundException('Lista zakupów nie została znaleziona');
    }
    if (shoppingList.user.id !== user.id) {
      throw new UnauthorizedException('Nie masz uprawnień do usunięcia tej listy zakupów');
    }
    await this.shoppingListsRepository.remove(shoppingList);
  }

  async findNearbyStores(user: User, listId: number, location: { lat: number; lng: number }): Promise<any[]> {
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id: listId },
      relations: ['user', 'items', 'sharedWith', 'sharedWith.user'],
    });
    if (!shoppingList) {
      throw new NotFoundException('Lista zakupów nie została znaleziona');
    }
    const isOwner = shoppingList.user.id === user.id;
    const isShared = shoppingList.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) {
      throw new UnauthorizedException('You do not have permission to access this shopping list');
    }
    
    const itemsForCategoryExtraction = shoppingList.items || [];
    const categories = [...new Set(
      itemsForCategoryExtraction.map(item => item.category).filter(category => !!category)
    )];

    if (!categories.length) {
      console.log('No categories found in shopping list items for nearby stores');
      return [];
    }
    
    console.log('Categories for nearby stores (from list items):', categories);
    return this.nearbyStoresService.findNearbyStores(location, categories);
  }
}