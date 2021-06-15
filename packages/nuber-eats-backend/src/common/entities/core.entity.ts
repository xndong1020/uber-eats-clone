import { Field, ObjectType } from '@nestjs/graphql';
import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType({ isAbstract: true })
@Entity()
export class CoreEntity {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @CreateDateColumn()
  @Field({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn()
  @Field({ nullable: true })
  updatedAt: Date;
}
