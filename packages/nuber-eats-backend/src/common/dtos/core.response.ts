import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ isAbstract: true })
export class CoreResponse {
  @Field({ nullable: true })
  error?: string;

  @Field(type => Boolean)
  ok: boolean;
}
