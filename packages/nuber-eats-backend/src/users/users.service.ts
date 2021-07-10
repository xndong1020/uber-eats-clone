import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { User } from './entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { SearchUserFilters } from './interfaces/search-user-filters.interface';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Verification } from './entities/verification.entity';
import { PasswordHelper } from 'src/common/utils/PasswordHelper';

type QueryResult = [boolean, string?];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,

    private readonly connection: Connection,
    private readonly jwtService: JwtService,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find({});
  }

  async getOne(filters: SearchUserFilters): Promise<User> {
    return this.usersRepository.findOneOrFail({ ...filters });
  }

  async createUser(newUserDto: CreateUserDto): Promise<QueryResult> {
    try {
      const userInDb = await this.usersRepository.findOne({
        email: newUserDto.email,
      });

      if (userInDb) throw new Error('Email already registered');

      const newUser = this.usersRepository.create(newUserDto);
      await this.usersRepository.save(newUser);

      const verification = this.verificationRepository.create({
        user: newUser,
      });
      await this.verificationRepository.save(verification);

      return [true];
    } catch (e) {
      return [false, e.message];
    }
  }

  async updateUser(
    authUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<QueryResult> {
    try {
      const userInDb = await this.usersRepository.findOneOrFail({
        email: authUser.email,
      });

      // In the documentation it says that updates must be made directly to the model
      // https://github.com/typeorm/typeorm/blob/master/docs/listeners-and-subscribers.md#beforeupdate
      Object.keys(updateUserDto).forEach((key) => {
        userInDb[key] = updateUserDto[key];
      });

      await this.usersRepository.save(userInDb);
      return [true];
    } catch (e) {
      return [false, e.message];
    }
  }

  async loginUser({
    email,
    password,
  }: LoginUserDto): Promise<[boolean, string?, string?]> {
    try {
      const userInDb = await this.usersRepository.findOneOrFail({ email });

      const isPasswordMatch = await PasswordHelper.validatePassword(
        password,
        userInDb.password,
      );
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true, null, await this.jwtService.sign({ id: userInDb.id })];
    } catch (e) {
      return [false, e.message];
    }
  }

  async verifyEmail(verificationCode: string): Promise<QueryResult> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const verificationRecord =
        await this.verificationRepository.findOneOrFail(
          {
            code: verificationCode,
          },
          { relations: ['user'] },
        );

      const userInDb = await this.usersRepository.findOneOrFail({
        id: verificationRecord.user.id,
      });

      userInDb.verified = true;

      try {
        await queryRunner.manager.save<User>(userInDb);
        await queryRunner.manager.delete<Verification>(Verification, {
          code: verificationCode,
        });

        await queryRunner.commitTransaction();
        return [true];
      } catch (e) {
        console.error('error', e);
        await queryRunner.rollbackTransaction();
        return [false, e.message];
      } finally {
        // you need to release a queryRunner which was manually instantiated
        await queryRunner.release();
      }
    } catch (e) {
      console.error('error', e);
      return [false, e.message];
    }
  }
}
