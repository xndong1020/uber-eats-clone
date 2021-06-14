import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'restaurants' })
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field(() => Int)
  id: number;

  @Column()
  @Field()
  @IsString()
  @Length(5, 10)
  name: string;

  @Column({ name: 'vegan_only', type: Boolean })
  @Field(() => Boolean)
  @IsBoolean()
  veganOnly: boolean;

  @Column({ name: 'is_good', type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isGood?: boolean;
}
