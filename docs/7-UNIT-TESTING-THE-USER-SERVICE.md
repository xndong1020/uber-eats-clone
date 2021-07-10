#### Setup `users.service.spec.ts`

starting test in watch mode:

```
yarn test:watch
```

and create a skeleton for the test:

```ts
describe('usersService', () => {
  it.todo('createUser');
  it.todo('updateUser');
  it.todo('loginUser');
  it.todo('verifyEmail');
  it.todo('getAll');
  it.todo('getOne');
});
```

To start our test, we need an instance of `UsersService`. Nest.js provides you with `Test` module, which gives you an isolated module for testing.

```ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('usersService', () => {
  let service: UsersService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

Now you will get an error, `Cannot find module 'src/common/entities/core.entity' from 'user.entity.ts'`.This is because `user.entity.ts` extends `core.entity`, and `jest` doesn't recognize the import path like `import { CoreEntity } from 'src/common/entities/core.entity';`. It prefer something like `../../common/entities/core.entity`.

This is configurable in package.json, by adding the `moduleNameMapper` block

```json
 "jest": {
    "moduleNameMapper": {
      "^src/(.*)$": "<rootDir>/$1"
    },
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".spec.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
```

Let's explain it:

^src/(._)$: Whatever starts with src/, and continues with literally whatever ((._)$) till the end of the string, grouping it by using the parenthesis

<rootDir>/$1: <rootDir> is a special word of Jest, meaning the root directory. Then we map it to the src/, and with $1 we append the whatever clause from the (.\*) statement.

For example, `src/common/entities/core.entity` will be mapped to `<rootDir>/common/entities/core.entity`

Now you will have a different error:

```
 Nest can't resolve dependencies of the UsersService (?, VerificationRepository, Connection, JwtS
ervice). Please make sure that the argument UserRepository at index [0] is available in the RootTest Module context.
```

Because our `UsersService` needs below dependencies:

1. `@InjectRepository(User) private readonly usersRepository: Repository<User>,`
2. `@InjectRepository(Verification) private readonly verificationRepository: Repository<Verification>`
3. `private readonly connection: Connection`
4. `private readonly jwtService: JwtService`

We need to provide mock implement of those dependencies, from the `providers` list

**providers**: Optional list of providers that will be instantiated by the Nest injector and that may be shared at least across this module.

```ts
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
  verify: jest.fn,
};

describe('usersService', () => {
  let service: UsersService;

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
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should throw error if user exits', () => {});
  });
  it.todo('updateUser');
  it.todo('loginUser');
  it.todo('verifyEmail');
  it.todo('getAll');
  it.todo('getOne');
});
```

Now the error is gone.

#### Mock methods in UsersRepository

`Record<keyof Repository<User>, jest.Mock` means create a Record, its keys are from looping through all the methods of `Repository<User>`, and its value are `jest.Mock`.

`Partial<Record<keyof Repository<User>, jest.Mock>>` means make any of the properties in this Record optional.

```ts
let usersRepository: Partial<Record<keyof Repository<User>, jest.Mock>>;
```

then we can make this type generic

```ts
type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

let usersRepository: MockRepository<User>;
let verificationRepository: MockRepository<Verification>;

usersRepository = module.get(getRepositoryToken(User));
verificationRepository = module.get(getRepositoryToken(Verification));
```

Now everything is setup and we can start our testing.

The first line of `createUser` is like below

```ts
const userInDb = await this.usersRepository.findOne({
  email: newUserDto.email,
});

if (userInDb) throw new Error('Email already registered');
```

To trigger the Error, the mocked `this.usersRepository.findOne` should return an found user

We can either mock it by using

```ts
jest.spyOn(usersRepository, 'findOne').mockResolvedValueOnce({
  email: 'fake@email.com',
  id: 1,
});
```

or

```ts
usersRepository.findOne = jest.fn().mockResolvedValueOnce({
  email: 'fake@email.com',
  id: 1,
});
```

```ts
describe('createUser', () => {
  it('should fail if user exits', async () => {
    // in this test, userRepository.findOne should return an existing user
    usersRepository.findOne = jest.fn().mockResolvedValueOnce({
      email: 'fake@email.com',
      id: 1,
    });

    const result = await service.createUser({
      email: 'fake@email.com',
      password: '123',
      role: UserRole.CLIENT,
    });

    expect(result).toMatchObject([false, 'Email already registered']);
  });
});
```

If you run `yarn test:cov` now, you will see that Jest also tested entity classes.

We can exclude testing for entity class by adding `coveragePathIgnorePatterns` block in `package.json`

```ts
  "jest": {
    "moduleNameMapper": {
      "^src/(.*)$": "<rootDir>/$1"
    },
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".spec.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": [
      "node_modules",
      ".entity.ts",
      ".constants.ts",
      ".enum.ts"
    ]
  }
```

Then we finish the rest of the `createUser`

```ts
const createUserArgs = {
  email: 'fake@email.com',
  password: '123',
  role: UserRole.CLIENT,
};

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
```

### Testing `loginUser`

```ts
describe('loginUser', () => {
  it('should fail if no user found', async () => {
    usersRepository.findOneOrFail = jest
      .fn()
      .mockRejectedValueOnce(new Error('some error'));

    const result = await service.loginUser(loginUserArgs);
    expect(result).toMatchObject([false, 'some error']);
  });

  it('should fail if password validation returns false', async () => {
    usersRepository.findOneOrFail = jest.fn().mockResolvedValue(createUserArgs);

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
    usersRepository.findOneOrFail = jest.fn().mockResolvedValue(createUserArgs);

    PasswordHelper.validatePassword = jest.fn().mockReturnValueOnce(true);
    jwtService.sign = jest.fn().mockResolvedValueOnce('some token');
    const result = await service.loginUser(loginUserArgs);
    expect(result).toMatchObject([true, null, 'some token']);
  });
});
```

#### Test getAll and getOne

```ts
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
```

#### Test `UpdateUser`

```ts
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
  ...

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
```
