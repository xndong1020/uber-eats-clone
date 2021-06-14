import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class QueryRestaurantDto {
  @Field({ nullable: true })
  @IsOptional()
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  veganOnly?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isGood?: boolean;
}
