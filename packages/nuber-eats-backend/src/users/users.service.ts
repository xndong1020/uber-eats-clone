import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { User } from './entities/user.entity';
import { PasswordHelper } from 'src/common/utils/password-helper.util';

type QueryResult = [boolean, string?];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find({});
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

  async loginUser({
    email,
    password,
  }: LoginUserDto): Promise<[boolean, string?, string?]> {
    try {
      const userInDb = await this.usersRepository.findOne({ email });

      if (!userInDb) throw new Error('Invalid email/password');

      const isPasswordMatch = await PasswordHelper.validatePassword(
        password,
        userInDb.password,
      );
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true, null, 'lalala'];
    } catch (e) {
      console.error(e);
      return [false, e.message];
    }
  }
}
