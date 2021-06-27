import { InputType, PartialType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@InputType()
export class UpdateUserDto extends PartialType(
  PickType(User, ['email', 'password', 'role'] as const),
) {}
