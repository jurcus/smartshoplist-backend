import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let authService: AuthService;

  const mockUsersService = {
    register: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };
      const registeredUser = { id: 1, ...userData };
      mockUsersService.register.mockResolvedValue(registeredUser);

      const result = await controller.register(userData.name, userData.email, userData.password);
      expect(result).toEqual(registeredUser);
      expect(mockUsersService.register).toHaveBeenCalledWith(userData.name, userData.email, userData.password);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const loginResponse = { access_token: 'jwt-token' };
      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginData.email, loginData.password);
      expect(result).toEqual(loginResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData.email, loginData.password);
    });
  });
});