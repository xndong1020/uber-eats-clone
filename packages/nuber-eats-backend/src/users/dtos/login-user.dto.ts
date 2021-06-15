import { InputType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@InputType()
export class LoginUserDto extends PickType(User, [
  'email',
  'password',
] as const) {}
