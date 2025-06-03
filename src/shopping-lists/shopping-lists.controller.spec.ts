import { Test, TestingModule } from '@nestjs/testing';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { SharedListsService } from './shared-lists.service';
import { UsersService } from '../users/users.service';
import { Repository } from 'typeorm';
import { ShoppingList } from '../entities/shopping-list.entity';
import { User } from '../entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('ShoppingListsController', () => {
  let controller: ShoppingListsController;
  let shoppingListsService: ShoppingListsService;
  let sharedListsService: SharedListsService;
  let usersService: UsersService;

  const mockShoppingListsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    searchItems: jest.fn(),
    findNearbyStores: jest.fn(),
  };

  const mockSharedListsService = {
    shareList: jest.fn(),
    removeSharedAccess: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockShoppingListRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListsController],
      providers: [
        {
          provide: ShoppingListsService,
          useValue: mockShoppingListsService,
        },
        {
          provide: SharedListsService,
          useValue: mockSharedListsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(ShoppingList),
          useValue: mockShoppingListRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    controller = module.get<ShoppingListsController>(ShoppingListsController);
    shoppingListsService = module.get<ShoppingListsService>(ShoppingListsService);
    sharedListsService = module.get<SharedListsService>(SharedListsService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});