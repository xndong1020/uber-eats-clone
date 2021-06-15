import { ObjectType } from '@nestjs/graphql';
import { CoreResponse } from 'src/common/dtos/core.response';

@ObjectType()
export class CreateUserResponse extends CoreResponse {}
