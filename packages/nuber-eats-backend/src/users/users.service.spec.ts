import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from 'src/common/enums/USER_ROLE.enum';
import { PasswordHelper } from 'src/common/utils/PasswordHelper';
import { JwtService } from 'src/jwt/jwt.service';
import { Connection, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersService } from './users.service';

const mockUserRepository = {
  create: jest.fn,
  save: jest.fn,
  find: jest.fn,
  findOne: jest.fn,
  findOneOrFail: jest.fn,
};

const mockVerificationRepository = {
  create: jest.fn,
  save: jest.fn,
  findOneOrFail: jest.fn,
};

const mockConnection = {
  createQueryRunner: jest.fn,
};

const mockJwtService = {
  sign: jest.fn,
  verify: jest.fn
};

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('usersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;
  let verificationRepository: MockRepository<Verification>;
  let jwtService: JwtService;

  const createUserArgs = {
    email: 'fake@email.com',
    password: '123',
    role: UserRole.CLIENT,
  };
  const loginUserArgs = {
    email: 'fake@email.com',
    password: '123',
  };

  const mockAuthUser = {
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'fake password',
    email: 'fake@test.com',
    role: UserRole.CLIENT,
    verified: true,
    hashPassword: jest.fn(() => Promise.resolve()),
  };

  const mockUser = {
    id: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'fake password',
    email: 'fake2@test.com',
    role: UserRole.CLIENT,
    verified: true,
    hashPassword: jest.fn(() => Promise.resolve()),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockVerificationRepository,
        },
        {
          provide: Connection,
          useValue: mockConnection,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should fail if user exists', async () => {
      // in this test, userRepository.findOne should return an existing user
      // jest.spyOn(usersRepository, 'findOne').mockResolvedValueOnce({
      //   email: 'fake@email.com',
      //   id: 1,
      // });
      usersRepository.findOne = jest.fn().mockResolvedValueOnce({
        email: 'fake@email.com',
        id: 1,
      });

      const result = await service.createUser(createUserArgs);

      expect(result).toMatchObject([false, 'Email already registered']);
    });

    it('should create user if user DOES NOT exist', async () => {
      usersRepository.findOne = jest.fn().mockResolvedValueOnce(undefined);
      // jest.spyOn(usersRepository, 'create');
      // jest.spyOn(usersRepository, 'save');

      // jest.spyOn(verificationRepository, 'create');
      // jest.spyOn(verificationRepository, 'save');

      usersRepository.create = jest.fn().mockReturnValueOnce(createUserArgs);
      usersRepository.save = jest.fn();

      verificationRepository.create = jest.fn().mockReturnValueOnce({
        user: createUserArgs,
        code: '1234',
      });
      verificationRepository.save = jest.fn();

      const result = await service.createUser(createUserArgs);

      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenLastCalledWith(createUserArgs);

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenLastCalledWith(createUserArgs);

      expect(verificationRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenLastCalledWith({
        user: createUserArgs,
      });

      expect(verificationRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenLastCalledWith({
        user: createUserArgs,
        code: '1234',
      });

      expect(result).toEqual([true]);
    });

    it('should fail on exception', async () => {
      usersRepository.findOne = jest
        .fn()
        .mockRejectedValueOnce(new Error('some error'));
      const result = await service.createUser(createUserArgs);

      expect(result).toMatchObject([false, 'some error']);
    });
  });

  describe('loginUser', () => {
    it('should fail if no user found', async () => {
      usersRepository.findOneOrFail = jest
        .fn()
        .mockRejectedValueOnce(new Error('some error'));

      const result = await service.loginUser(loginUserArgs);
      expect(result).toMatchObject([false, 'some error']);
    });

    it('should fail if password validation returns false', async () => {
      usersRepository.findOneOrFail = jest
        .fn()
        .mockResolvedValue(createUserArgs);

      PasswordHelper.validatePassword = jest.fn().mockReturnValueOnce(false);

      const result = await service.loginUser(loginUserArgs);
      expect(usersRepository.findOneOrFail).toBeCalledTimes(1);
      expect(usersRepository.findOneOrFail).toBeCalledWith({
        email: loginUserArgs.email,
      });

      expect(PasswordHelper.validatePassword).toBeCalledTimes(1);
      expect(PasswordHelper.validatePassword).toBeCalledWith(
        loginUserArgs.password,
        createUserArgs.password,
      );

      expect(result).toMatchObject([false, 'Invalid email/password']);
    });

    it('should login user', async () => {
      usersRepository.findOneOrFail = jest
        .fn()
        .mockResolvedValue(createUserArgs);

      PasswordHelper.validatePassword = jest.fn().mockReturnValueOnce(true);
      jwtService.sign = jest.fn().mockResolvedValueOnce('some token');
      const result = await service.loginUser(loginUserArgs);
      expect(result).toMatchObject([true, null, 'some token']);
    });
  });

  describe('updateUser', () => {
    it('should fail if user not found', async () => {
      usersRepository.findOneOrFail = jest
        .fn()
        .mockRejectedValueOnce(new Error('some error'));

      const result = await service.updateUser(mockAuthUser, {
        email: 'fake@email.com',
      });

      expect(result).toMatchObject([false, 'some error']);
    });

    it('should update user', async () => {
      usersRepository.findOneOrFail = jest.fn().mockResolvedValueOnce(mockUser);
      usersRepository.save = jest.fn();

      const result = await service.updateUser(mockAuthUser, {
        email: 'fake@email.com',
      });
      expect(usersRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOneOrFail).toHaveBeenCalledWith({
        email: mockAuthUser.email,
      });
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      // verify that it was called with updated model
      expect(usersRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        email: 'fake@email.com',
      });
      expect(result).toMatchObject([true]);
    });
  });

  it.todo('verifyEmail');

  describe('getAll', () => {
    it('should return users if found', async () => {
      usersRepository.find = jest.fn().mockResolvedValueOnce([createUserArgs]);
      const result = await service.getAll();
      expect(usersRepository.find).toHaveBeenCalledTimes(1);
      expect(usersRepository.find).toHaveBeenCalledWith({});
      expect(result).toMatchObject([createUserArgs]);
    });
  });

  describe('getOne', () => {
    it('should return user if found', async () => {
      usersRepository.findOneOrFail = jest
        .fn()
        .mockResolvedValueOnce(createUserArgs);

      const result = await service.getOne({ email: 'fake@email.com' });
      expect(result).toMatchObject(createUserArgs);
    });

    it('should throw error if no user found', async () => {
      usersRepository.findOneOrFail = jest
        .fn()
        .mockRejectedValueOnce(new Error('some error'));

      try {
        const result = await service.getOne({ email: 'fake@email.com' });
        expect(result).toBeUndefined();
      } catch (e) {
        expect(e).toBeDefined();
        expect(e.message).toEqual('some error');
      }
    });
  });
});
