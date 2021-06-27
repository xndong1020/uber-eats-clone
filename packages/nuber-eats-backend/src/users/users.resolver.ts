import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';

import { AuthGuard } from 'src/auth/auth.guard';
import { EnvGuard } from 'src/common/env.guard';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateUserResponse } from './dtos/create-user.response';
import { LoginUserDto } from './dtos/login-user.dto';
import { LoginUserResponse } from './dtos/login-user.response';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { NODE_ENV } from 'src/common/enums/NODE_ENV.enum';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { RoleGuard } from 'src/auth/role-guard';
import { UserRole } from 'src/common/enums/USER_ROLE.enum';
import { UpdateUserResponse } from './dtos/update-user.response';
import { UpdateUserDto } from './dtos/update-user.dto';
import { VerifyEmailResponse } from './dtos/verify-email.response';

@Resolver(of => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Query(returns => [User])
  async getUsers(): Promise<User[]> {
    return await this.usersService.getAll();
  }

  @Query(returns => User)
  @UseGuards(
    AuthGuard,
    EnvGuard.setAllowedEnvs([NODE_ENV.DEV, NODE_ENV.SIT]),
    RoleGuard.setAllowedRoles([UserRole.CLIENT, UserRole.OWNER]),
  )
  async me(@AuthUser() authUser: User): Promise<User> {
    return authUser;
  }

  @Mutation(returns => CreateUserResponse)
  async createUser(
    @Args('newUser') newUser: CreateUserDto,
  ): Promise<CreateUserResponse> {
    const [ok, error] = await this.usersService.createUser(newUser);
    return { ok, error };
  }

  @Mutation(returns => UpdateUserResponse)
  @UseGuards(AuthGuard, EnvGuard.setAllowedEnvs([NODE_ENV.DEV, NODE_ENV.SIT]))
  async updateUser(
    @Args('updateUser') updateUser: UpdateUserDto,
    @AuthUser() authUser: User,
  ): Promise<UpdateUserResponse> {
    const [ok, error] = await this.usersService.updateUser(
      authUser,
      updateUser,
    );
    return { ok, error };
  }

  @Mutation(returns => LoginUserResponse)
  async loginUser(
    @Args('loginUser') loginUser: LoginUserDto,
  ): Promise<LoginUserResponse> {
    const [ok, error, token] = await this.usersService.loginUser(loginUser);
    return { ok, error, token };
  }

  @Mutation(returns => VerifyEmailResponse)
  async verifyEmail(@Args('verificationCode') verificationCode: string) {
    const [ok, error] = await this.usersService.verifyEmail(verificationCode);
    return { ok, error };
  }
}
