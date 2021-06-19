import { InputType, OmitType, PartialType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@InputType()
export class SearchUserFilters extends PartialType(
  OmitType(User, ['password', 'role'] as const),
) {}
