import { Field, ObjectType } from '@nestjs/graphql';
import { CoreResponse } from 'src/common/dtos/core.response';

@ObjectType()
export class LoginUserResponse extends CoreResponse {
  @Field({ nullable: true })
  token?: string;
}
