import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully with password', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ ...userData, password: hashedPassword });
      mockUserRepository.save.mockResolvedValue({ ...userData, id: 1, password: hashedPassword });

      const result = await service.register(userData.name, userData.email, userData.password);
      expect(result).toEqual({ ...userData, id: 1, password: hashedPassword });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith({ ...userData, password: hashedPassword });
    });

    it('should register a new user successfully without password', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: null };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ ...userData });
      mockUserRepository.save.mockResolvedValue({ ...userData, id: 1 });

      const result = await service.register(userData.name, userData.email, userData.password);
      expect(result).toEqual({ ...userData, id: 1 });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith({ ...userData });
    });

    it('should throw ConflictException if email already exists', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      mockUserRepository.findOne.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await expect(service.register(userData.name, userData.email, userData.password)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});