import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { User } from './entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { SearchUserFilters } from './interfaces/search-user-filters.interface';
import { UpdateUserDto } from './dtos/update-user.dto';

type QueryResult = [boolean, string?];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
      return [true];
    } catch (e) {
      console.error('error', e);
      return [false, e.message];
    }
  }

  async updateUser(
    authUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<QueryResult> {
    try {
      const userInDb = await this.usersRepository.findOne({
        email: authUser.email,
      });

      if (!userInDb) throw new Error('User not found');

      // In the documentation it says that updates must be made directly to the model
      // https://github.com/typeorm/typeorm/blob/master/docs/listeners-and-subscribers.md#beforeupdate
      Object.keys(updateUserDto).forEach(key => {
        userInDb[key] = updateUserDto[key];
      });

      await this.usersRepository.save(userInDb);
      return [true];
    } catch (e) {
      console.error('error', e);
      return [false, e.message];
    }
  }

  async loginUser({
    email,
    password,
  }: LoginUserDto): Promise<[boolean, string?, string?]> {
    try {
      const userInDb = await this.usersRepository.findOne({ email });

      if (!userInDb) throw new Error('Invalid email/password');

      const isPasswordMatch = await this.jwtService.validatePassword(
        password,
        userInDb.password,
      );
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true, null, await this.jwtService.sign({ id: userInDb.id })];
    } catch (e) {
      console.error(e);
      return [false, e.message];
    }
  }
}
