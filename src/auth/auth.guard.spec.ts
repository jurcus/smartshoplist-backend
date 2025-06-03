import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PassportModule } from '@nestjs/passport';
import { User } from '../entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;

  // Mock dla super.canActivate, aby symulować zachowanie Passport
  const mockSuperCanActivate = jest.fn();

  // Nadpiszemy AuthGuard, aby mockować metodę canActivate z klasy bazowej
  class MockAuthGuard extends AuthGuard {
    constructor() {
      super();
      (this as any).canActivate = mockSuperCanActivate;
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        {
          provide: AuthGuard,
          useClass: MockAuthGuard,
        },
      ],
    }).compile();

    authGuard = module.get<AuthGuard>(AuthGuard);
    mockSuperCanActivate.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authGuard).toBeDefined();
  });

  it('should allow access with a valid token', async () => {
    const mockRequest: Partial<Request> = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as Request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as ExecutionContext;

    const user = {
      id: 1,
      email: 'jan@example.com',
      name: 'Jan',
      password: 'hashedPassword',
    } as User;

    // Symulujemy, że Passport zwraca true i ustawia użytkownika
    mockSuperCanActivate.mockImplementation(
      async (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = user;
        return true;
      }
    );

    const result = await authGuard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(mockRequest['user']).toEqual(user);
    expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
  });

  it('should return false if token is missing', async () => {
    const mockRequest: Partial<Request> = {
      headers: {},
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as Request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as ExecutionContext;

    // Symulujemy, że Passport zwraca false
    mockSuperCanActivate.mockResolvedValue(false);

    const result = await authGuard.canActivate(mockContext);
    expect(result).toBe(false);
    expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
  });

  it('should return false if token is invalid', async () => {
    const mockRequest: Partial<Request> = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as Request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as ExecutionContext;

    // Symulujemy, że Passport zwraca false
    mockSuperCanActivate.mockResolvedValue(false);

    const result = await authGuard.canActivate(mockContext);
    expect(result).toBe(false);
    expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
  });
});
