import { Test, TestingModule } from '@nestjs/testing';
import { ShoppingListsService } from './shopping-lists.service';
import { Repository } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PromotionsService } from '../promotions/promotions.service';
import { NearbyStoresService } from '../nearby-stores/nearby-stores.service';
import { SharedListsService } from './shared-lists.service';
import { User } from '../entities/user.entity';

describe('ShoppingListsService', () => {
  let service: ShoppingListsService;
  let shoppingListRepository: Repository<ShoppingList>;

  const mockShoppingListRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockPromotionsService = {
    getPromotionsForProduct: jest.fn(),
    getPromotionsForList: jest.fn(),
  };

  const mockNearbyStoresService = {
    findNearbyStores: jest.fn(),
  };

  const mockSharedListsService = {
    shareList: jest.fn(),
    removeSharedAccess: jest.fn(),
    getSharedLists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListsService,
        {
          provide: getRepositoryToken(ShoppingList),
          useValue: mockShoppingListRepository,
        },
        {
          provide: PromotionsService,
          useValue: mockPromotionsService,
        },
        {
          provide: NearbyStoresService,
          useValue: mockNearbyStoresService,
        },
        {
          provide: SharedListsService,
          useValue: mockSharedListsService,
        },
      ],
    }).compile();

    service = module.get<ShoppingListsService>(ShoppingListsService);
    shoppingListRepository = module.get<Repository<ShoppingList>>(getRepositoryToken(ShoppingList));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new shopping list', async () => {
      const user = { id: 1, email: 'test@example.com' } as User;
      const name = 'Test List';
      const items = [{ name: 'Milk', quantity: 1, bought: false, category: '', store: '' }];

      const createdList = { id: 1, name, user, items };
      const transformedItems = items.map(item => ({ ...item, promotions: [] }));
      const expectedResult = { id: 1, name, user, items: transformedItems };

      mockShoppingListRepository.create.mockReturnValue(createdList);
      mockShoppingListRepository.save.mockResolvedValue(createdList);
      mockPromotionsService.getPromotionsForList.mockResolvedValue(transformedItems);

      const result = await service.create(user, name, items);
      expect(result).toEqual(expectedResult);
      expect(mockShoppingListRepository.create).toHaveBeenCalledWith({ name, user });
      expect(mockShoppingListRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name, user, items }));
      expect(mockPromotionsService.getPromotionsForList).toHaveBeenCalledWith(items);
    });
  });

  describe('findAll', () => {
    it('should return all shopping lists for a user', async () => {
      const user = { id: 1, email: 'test@example.com' } as User;
      const ownLists = [
        { id: 1, name: 'List 1', user, items: [], itemsSerialized: [] },
        { id: 2, name: 'List 2', user, items: [], itemsSerialized: [] },
      ];
      const sharedLists = [
        { id: 3, name: 'Shared List 1', user: { id: 2 }, items: [], itemsSerialized: [] },
      ];

      const transformedOwnLists = ownLists.map(list => ({
        id: list.id,
        name: list.name,
        user: list.user,
        items: [],
      }));
      const transformedSharedLists = sharedLists.map(list => ({
        id: list.id,
        name: list.name,
        user: list.user,
        items: [],
      }));

      mockShoppingListRepository.find.mockResolvedValue(ownLists);
      mockSharedListsService.getSharedLists.mockResolvedValue(sharedLists);
      mockPromotionsService.getPromotionsForList.mockResolvedValue([]);

      const result = await service.findAll(user);
      expect(result).toEqual([...transformedOwnLists, ...transformedSharedLists]);
      expect(mockShoppingListRepository.find).toHaveBeenCalledWith({
        where: { user: { id: user.id } },
      });
      expect(mockSharedListsService.getSharedLists).toHaveBeenCalledWith(user);
      expect(mockPromotionsService.getPromotionsForList).toHaveBeenCalledTimes(3); // Dla każdej listy
    });
  });
});