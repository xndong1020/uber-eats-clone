import { InputType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@InputType()
export class CreateUserDto extends PickType(User, [
  'email',
  'password',
  'role',
] as const) {}
