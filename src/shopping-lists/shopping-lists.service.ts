/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { NearbyStoresService } from '../nearby-stores/nearby-stores.service';
import { SharedListsService } from './shared-lists.service';
import axios from 'axios'; // Dodajemy import

@Injectable()
export class ShoppingListsService {
  constructor(
    @InjectRepository(ShoppingList)
    private shoppingListsRepository: Repository<ShoppingList>,
    private promotionsService: PromotionsService,
    private nearbyStoresService: NearbyStoresService,
    private sharedListsService: SharedListsService,
  ) {}

  private async transformShoppingListWithPromotions(list: ShoppingList): Promise<any> {
    try {
      const itemsWithPromotions = await this.promotionsService.getPromotionsForList(list.items);
      const { itemsSerialized, ...rest } = list;
      return {
        ...rest,
        items: itemsWithPromotions,
      };
    } catch (error) {
      console.error(`Błąd podczas pobierania promocji dla listy ${list.name}:`, error.message);
      const { itemsSerialized, ...rest } = list;
      return {
        ...rest,
        items: list.items.map(item => ({ ...item, promotions: [] })),
      };
    }
  }

  async create(
    user: User,
    name: string,
    items: { name: string; category?: string; store?: string; quantity: number; bought: boolean }[],
  ): Promise<any> {
    console.log('Creating shopping list with items:', items);
    const shoppingList = this.shoppingListsRepository.create({ name, user });
    shoppingList.items = items.map((item) => ({
      name: item.name,
      category: item.category || '',
      store: item.store || '',
      quantity: item.quantity,
      bought: item.bought ?? false,
    }));
    console.log('Shopping list before save:', shoppingList);
    const savedList = await this.shoppingListsRepository.save(shoppingList);
    console.log('Saved shopping list:', savedList);
    return this.transformShoppingListWithPromotions(savedList);
  }

  async createFromApi(user: User): Promise<any> {
    const response = await axios.get('https://fakestoreapi.com/products');
    const products = response.data.slice(0, 5); // Pobieramy 5 produktów
    const items = products.map((product: any) => ({
      name: product.title,
      category: product.category,
      store: '',
      quantity: 1,
      bought: false,
    }));
    const shoppingList = this.shoppingListsRepository.create({
      name: 'Lista z Fake Store',
      user,
    });
    shoppingList.items = items;
    shoppingList.source = 'api'; // Ustawiamy source na 'api'
    const savedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(savedList);
  }

  async findAll(user: User): Promise<any[]> {
    // Pobierz własne listy użytkownika
    const ownLists = await this.shoppingListsRepository.find({
      where: { user: { id: user.id } },
    });

    // Pobierz udostępnione listy
    const sharedLists = await this.sharedListsService.getSharedLists(user);

    // Połącz listy i przekształć z promocjami
    const allLists = [...ownLists, ...sharedLists];
    return Promise.all(allLists.map((list) => this.transformShoppingListWithPromotions(list)));
  }

  async findOne(user: User, id: number): Promise<any> {
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id },
      relations: ['user', 'sharedWith', 'sharedWith.user'], // Ładujemy relacje
    });
    if (!shoppingList) {
      throw new NotFoundException('Lista zakupów nie została znaleziona');
    }

    // Sprawdź, czy użytkownik jest właścicielem lub ma dostęp przez udostępnienie
    const isOwner = shoppingList.user.id === user.id;
    const isShared = shoppingList.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) {
      throw new UnauthorizedException('You do not have permission to access this shopping list');
    }

    return this.transformShoppingListWithPromotions(shoppingList);
  }

  async addItem(user: User, id: number, item: { name: string; category?: string; store?: string; quantity: number }): Promise<any> {
    const shoppingList = await this.findOne(user, id);
    const currentItems = shoppingList.items;
    currentItems.push({ name: item.name, category: item.category || '', store: item.store || '', quantity: item.quantity, bought: false });
    shoppingList.items = currentItems;
    const updatedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(updatedList);
  }

  async updateItem(
    user: User,
    id: number,
    itemIndex: number,
    update: { name?: string; category?: string; store?: string; quantity?: number; bought?: boolean },
  ): Promise<any> {
    const shoppingList = await this.findOne(user, id);
    const currentItems = shoppingList.items;
    if (itemIndex >= currentItems.length) {
      throw new NotFoundException('Item not found');
    }
    currentItems[itemIndex] = { ...currentItems[itemIndex], ...update };
    shoppingList.items = currentItems;
    const updatedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(updatedList);
  }

  async update(
    user: User,
    id: number,
    name: string,
    items: { name: string; category?: string; store?: string; quantity: number; bought: boolean }[],
  ): Promise<any> {
    const shoppingList = await this.findOne(user, id);
    shoppingList.name = name;
    shoppingList.items = items.map((item) => ({
      name: item.name,
      category: item.category || '',
      store: item.store || '',
      quantity: item.quantity,
      bought: item.bought ?? false,
    }));
    const updatedList = await this.shoppingListsRepository.save(shoppingList);
    return this.transformShoppingListWithPromotions(updatedList);
  }

  async searchItems(
    user: User,
    query: { name?: string; category?: string; store?: string },
  ): Promise<{ listId: number; listName: string; items: any[] }[]> {
    const lists = await this.findAll(user); // Używamy zaktualizowanego findAll, który uwzględnia udostępnione listy

    const results = await Promise.all(
      lists.map(async (list) => {
        const filteredItems = list.items.filter((item) => {
          const matchesName = query.name ? (item.name || '').toLowerCase().includes(query.name.toLowerCase()) : true;
          const matchesCategory = query.category ? (item.category || '').toLowerCase() === query.category.toLowerCase() : true;
          const matchesStore = query.store ? (item.store || '').toLowerCase() === query.store.toLowerCase() : true;
          return matchesName && matchesCategory && matchesStore;
        });

        try {
          const itemsWithPromotions = await this.promotionsService.getPromotionsForList(filteredItems);
          return {
            listId: list.id,
            listName: list.name,
            items: itemsWithPromotions,
          };
        } catch (error) {
          console.error(`Błąd podczas pobierania promocji dla listy ${list.name}:`, error.message);
          return {
            listId: list.id,
            listName: list.name,
            items: filteredItems.map(item => ({ ...item, promotions: [] })),
          };
        }
      }),
    );

    return results.filter((result) => result.items.length > 0);
  }

  async remove(user: User, id: number): Promise<void> {
    const shoppingList = await this.findOne(user, id);
    await this.shoppingListsRepository.save(shoppingList);
    await this.shoppingListsRepository.remove(shoppingList);
  }

  async findNearbyStores(user: User, id: number, location: { lat: number; lng: number }): Promise<any[]> {
    console.log('findNearbyStores service - user:', user); // Log dla debugowania
    const shoppingList = await this.shoppingListsRepository.findOne({
      where: { id },
      relations: ['user', 'sharedWith', 'sharedWith.user'], // Ładujemy relacje
    });
    console.log('findNearbyStores service - shoppingList:', shoppingList); // Log dla debugowania
    if (!shoppingList) {
      throw new NotFoundException('Lista zakupów nie została znaleziona');
    }

    // Sprawdź, czy użytkownik jest właścicielem lub ma dostęp przez udostępnienie
    const isOwner = shoppingList.user.id === user.id;
    const isShared = shoppingList.sharedWith?.some((shared) => shared.userId === user.id);
    if (!isOwner && !isShared) {
      console.log('findNearbyStores service - user mismatch:', { userId: user?.id, shoppingListUserId: shoppingList.user.id }); // Log dla debugowania
      throw new UnauthorizedException('You do not have permission to access this shopping list');
    }
    console.log('findNearbyStores service - user.id:', user.id, 'shoppingList.user.id:', shoppingList.user.id); // Log dla debugowania

    const itemsWithPromotions = await this.promotionsService.getPromotionsForList(shoppingList.items);
    console.log('Items with promotions in findNearbyStores:', itemsWithPromotions);

    // Najpierw używamy kategorii z items, jeśli są zdefiniowane, w przeciwnym razie z promocji
    const categories = [...new Set(itemsWithPromotions.flatMap(item => {
      // Używamy kategorii z item.category, jeśli istnieje
      if (item.category) {
        return item.category;
      }
      // Jeśli brak item.category, próbujemy użyć kategorii z promocji
      const promo = item.promotions[0];
      if (!promo) return [];
      // Używamy kategorii z Fake Store API (promo.category)
      return promo.category || [];
    }).filter(category => category))]; // Usuwamy puste kategorie

    console.log('Categories for nearby stores:', categories);

    if (!categories.length) {
      console.log('No categories found for nearby stores');
      return [];
    }

    return this.nearbyStoresService.findNearbyStores(location, categories);
  }
}