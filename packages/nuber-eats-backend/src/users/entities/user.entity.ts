import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { BeforeInsert, Column, Entity } from 'typeorm';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { PasswordHelper } from 'src/common/utils/password-helper.util';

enum UserRole {
  CLIENT = 'client',
  OWNER = 'owner',
  DELIVERY = 'delivery',
}

registerEnumType(UserRole, { name: 'UserRole' });

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'users' })
export class User extends CoreEntity {
  @Field()
  @Column()
  @IsEmail()
  email: string;

  @Field()
  @Column()
  @IsString()
  @Length(6, 10)
  password: string;

  @Field(type => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @BeforeInsert()
  async hashPassword() {
    this.password = await PasswordHelper.hashPassword(this.password);
  }
}
