import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateUserResponse } from './dtos/create-user.response';
import { LoginUserDto } from './dtos/login-user.dto';
import { LoginUserResponse } from './dtos/login-user.response';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver(of => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(returns => [User])
  async getUsers(): Promise<User[]> {
    return await this.usersService.getAll();
  }

  @Mutation(returns => CreateUserResponse)
  async createUser(
    @Args('newUser') newUser: CreateUserDto,
  ): Promise<CreateUserResponse> {
    const [ok, error] = await this.usersService.createUser(newUser);
    return { ok, error };
  }

  @Mutation(returns => LoginUserResponse)
  async loginUser(
    @Args('loginUser') loginUser: LoginUserDto,
  ): Promise<LoginUserResponse> {
    const [ok, error, token] = await this.usersService.loginUser(loginUser);
    return { ok, error, token };
  }
}
