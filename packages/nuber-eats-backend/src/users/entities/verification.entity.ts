import { Field, ObjectType } from '@nestjs/graphql';
import { v4 as uuid } from 'uuid';
import { IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { BeforeInsert, Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@ObjectType()
@Entity()
export class Verification extends CoreEntity {
  @Column()
  @Field()
  @IsString()
  code: string;

  @OneToOne(type => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @BeforeInsert()
  generateVerificationCode(): void {
    this.code = uuid();
  }
}
