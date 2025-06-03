// src/shopping-lists/shopping-lists.service.ts
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { ShoppingListItem } from '../entities/shopping-list-item.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { NearbyStoresService } from '../nearby-stores/nearby-stores.service';
import { SharedListsService } from './shared-lists.service';
import axios from 'axios';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto'; // Poprawiony import
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto'; // Poprawiony import
import { AddItemDto } from './dto/add-item.dto'; // Poprawny import
import { UpdateItemDto } from './dto/update-item.dto'; // Poprawny import

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

  // Definicja typu dla ItemInputDto, jeśli nie importujesz go z DTO (ale powinniśmy używać DTO)
  // Zmieniamy rawItems na bardziej generyczny typ, bo może przyjść string lub obiekt
  private _normalizeAndCreateItemEntities(rawItems: (string | AddItemDto | UpdateItemDto)[]): ShoppingListItem[] {
    return (rawItems || []).map((itemInput) => {
      const newItem = this.shoppingListItemRepository.create(); // Użyj create z repozytorium
      if (typeof itemInput === 'string') {
        newItem.name = itemInput;
        newItem.category = '';
        newItem.store = '';
        newItem.quantity = 1;
        newItem.bought = false;
      } else { // Zakładamy, że itemInput to AddItemDto lub UpdateItemDto lub podobny obiekt
        newItem.name = itemInput.name!; // Założenie: name zawsze będzie w obiekcie itemu
        newItem.category = itemInput.category || '';
        newItem.store = itemInput.store || '';
        newItem.quantity = itemInput.quantity === undefined ? 1 : itemInput.quantity;
        // Sprawdzamy, czy 'bought' istnieje i jest booleanem, inaczej domyślnie false
        if ('bought' in itemInput && typeof itemInput.bought === 'boolean') {
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
      const itemsWithPromotions = await this.promotionsService.getPromotionsForList(
        itemsToProcess.map(item => ({ name: item.name, category: item.category }))
      );
      const hydratedItems = itemsToProcess.map(item => {
        const promotionForItem = itemsWithPromotions.find(pItem => pItem.name === item.name && pItem.category === item.category);
        return {
          ...item,
          promotions: promotionForItem ? promotionForItem.promotions : [],
        };
      });
      return { ...list, items: hydratedItems };
    } catch (error) {
      console.error(`Błąd podczas pobierania promocji dla listy ${list.name}:`, error.message);
      return { ...list, items: itemsToProcess.map(item => ({ ...item, promotions: [] })) };
    }
  }

  async create(user: User, createShoppingListDto: CreateShoppingListDto): Promise<any> {
    const shoppingList = this.shoppingListsRepository.create({
      name: createShoppingListDto.name,
      user,
      source: 'manual',
    });
    shoppingList.items = this._normalizeAndCreateItemEntities(createShoppingListDto.items || []);
    const savedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(savedList);
  }

  async createFromApi(user: User): Promise<any> {
    const response = await axios.get('https://fakestoreapi.com/products');
    const products = response.data.slice(0, 5);
    const rawItems: AddItemDto[] = products.map((product: any) => ({
      name: product.title,
      category: product.category,
      store: 'Fake Store',
      quantity: 1,
      bought: false,
    }));
    const shoppingList = this.shoppingListsRepository.create({
      name: 'Lista z Fake Store',
      user,
      source: 'api',
    });
    shoppingList.items = this._normalizeAndCreateItemEntities(rawItems);
    const savedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(savedList);
  }

  async findAll(user: User): Promise<any[]> {
    const ownLists = await this.shoppingListsRepository.find({
      where: { user: { id: user.id } },
      relations: ['items', 'user', 'sharedWith', 'sharedWith.user'],
    });
    const sharedListEntities = await this.sharedListsService.getSharedLists(user);
    const sharedLists = await Promise.all(sharedListEntities.map(sl =>
      this.shoppingListsRepository.findOne({
        where: { id: sl.id },
        relations: ['items', 'user', 'sharedWith', 'sharedWith.user']
      })
    ));
    const allLists = [...ownLists, ...sharedLists.filter(list => list !== null)] as ShoppingList[];
    return Promise.all(allLists.map((list) => this.transformShoppingListWithPromotions(list)));
  }

  async findOne(user: User, id: number): Promise<any> {
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id },
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
        relations: ['user', 'sharedWith'] // Nie musimy tu ładować 'items', bo dodajemy nowy
    });
    if (!shoppingListEntity) {
      throw new NotFoundException('Lista zakupów nie została znaleziona');
    }
    const isOwner = shoppingListEntity.user.id === user.id;
    const isShared = shoppingListEntity.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) {
      throw new UnauthorizedException('Nie masz uprawnień do modyfikacji tej listy zakupów');
    }
    const newItemEntity = this.shoppingListItemRepository.create({
      name: addItemDto.name,
      category: addItemDto.category || '',
      store: addItemDto.store || '',
      quantity: addItemDto.quantity === undefined ? 1 : addItemDto.quantity,
      bought: false, // Zawsze false przy dodawaniu nowego itemu
      shoppingList: shoppingListEntity,
    });
    await this.shoppingListItemRepository.save(newItemEntity);
    // Po zapisie nowego itemu, shoppingListEntity.items nie jest automatycznie aktualizowane,
    // więc musimy ponownie załadować listę.
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
    // Najpierw sprawdź, czy lista istnieje i czy użytkownik ma do niej dostęp
    const shoppingListEntity = await this.shoppingListsRepository.findOne({
        where: { id: listId },
        relations: ['user', 'sharedWith'] // Nie potrzebujemy 'items' do tej weryfikacji
    });
    if (!shoppingListEntity) throw new NotFoundException('Lista zakupów nie została znaleziona');

    const isOwner = shoppingListEntity.user.id === user.id;
    const isShared = shoppingListEntity.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) {
      throw new UnauthorizedException('Nie masz uprawnień do modyfikacji tej listy zakupów');
    }

    // Znajdź item do aktualizacji, upewniając się, że należy do tej listy
    const itemToUpdate = await this.shoppingListItemRepository.findOne({
      where: { id: itemId, shoppingList: { id: listId } }
    });

    if (!itemToUpdate) {
      throw new NotFoundException(`Item with ID ${itemId} not found in list ${listId}`);
    }
    
    // Zastosuj aktualizacje z DTO
    if (updateItemDto.name !== undefined) itemToUpdate.name = updateItemDto.name;
    if (updateItemDto.category !== undefined) itemToUpdate.category = updateItemDto.category;
    if (updateItemDto.store !== undefined) itemToUpdate.store = updateItemDto.store;
    if (updateItemDto.quantity !== undefined) itemToUpdate.quantity = updateItemDto.quantity;
    if (updateItemDto.bought !== undefined) itemToUpdate.bought = updateItemDto.bought;

    await this.shoppingListItemRepository.save(itemToUpdate);

    // Załaduj zaktualizowaną listę, aby zwrócić ją z promocjami
    const updatedList = await this.shoppingListsRepository.findOne({
        where: {id: listId},
        relations: ['user', 'items', 'sharedWith', 'sharedWith.user']
    });
    if (!updatedList) throw new InternalServerErrorException('Nie udało się odświeżyć listy po aktualizacji elementu');
    
    return this.transformShoppingListWithPromotions(updatedList);
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
      
      // Usuń istniejące itemy powiązane z tą listą
      if (shoppingList.items && shoppingList.items.length > 0) {
        await queryRunner.manager.remove(ShoppingListItem, shoppingList.items);
      }
      
      // Stwórz nowe encje itemów i przypisz je do listy
      const newItemEntities = this._normalizeAndCreateItemEntities(updateShoppingListDto.items || []);
      // shoppingList.items = newItemEntities; // To powinno wystarczyć, jeśli cascade jest ustawione
      // Jednakże, aby jawnie powiązać itemy z listą przed zapisem w transakcji dla queryRunner.manager.save(ShoppingListItem, item)
      // musimy je przypisać. W przypadku `queryRunner.manager.save(ShoppingList, shoppingList)` z `cascade:true`,
      // TypeORM powinien sam obsłużyć powiązania.
      
      // Bezpośrednie przypisanie do shoppingList.items powinno działać z cascade:true na ShoppingList.items
      shoppingList.items = newItemEntities; 
      
      // Zapisz zmodyfikowaną listę zakupów (TypeORM z cascade:true zajmie się itemami)
      await queryRunner.manager.save(ShoppingList, shoppingList);
      
      await queryRunner.commitTransaction();

      // Musimy ponownie załadować listę z repozytorium, aby uzyskać itemy z ID i relacjami
      const reloadedList = await this.shoppingListsRepository.findOne({
          where: {id: listId},
          relations: ['user', 'items', 'sharedWith', 'sharedWith.user']
      });
      if (!reloadedList) throw new InternalServerErrorException('Nie udało się odświeżyć listy po aktualizacji');
      return this.transformShoppingListWithPromotions(reloadedList);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("Błąd podczas aktualizacji listy zakupów:", err);
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
    const sharedListsData = await Promise.all(sharedListEntities.map(sl =>
      this.shoppingListsRepository.findOne({
        where: { id: sl.id },
        relations: ['items', 'user', 'sharedWith', 'sharedWith.user']
      })
    ));
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
          console.error(`Błąd podczas pobierania promocji dla wyszukiwanych itemów z listy ${list.name}:`, error.message);
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
    const itemsForPromoCheck = (shoppingList.items || []).map(item => ({ name: item.name, category: item.category }));
    const itemsWithPromotions = await this.promotionsService.getPromotionsForList(itemsForPromoCheck);
    const categories = [...new Set(itemsWithPromotions.flatMap(item => {
      // Pierwszeństwo ma kategoria z itemu (ShoppingListItem), jeśli istnieje
      const originalItem = shoppingList.items.find(i => i.name === item.name && i.category === item.category);
      if (originalItem && originalItem.category) {
        return originalItem.category;
      }
      // Jeśli nie, próbuj z promocji (jeśli kategoria w promocji jest użyteczna)
      const promo = item.promotions && item.promotions[0];
      if (promo && promo.category) return promo.category;
      return []; // Jeśli brak kategorii, nie dodawaj niczego
    }).filter(category => category))]; // Usuń puste/null/undefined kategorie

    if (!categories.length) return [];
    return this.nearbyStoresService.findNearbyStores(location, categories);
  }
}