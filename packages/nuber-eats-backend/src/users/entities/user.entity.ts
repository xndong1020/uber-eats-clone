import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';
import { IsBoolean, IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { UserRole } from 'src/common/enums/USER_ROLE.enum';
import { PasswordHelper } from 'src/common/utils/PasswordHelper';

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

  @Field((type) => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @Field((type) => Boolean)
  @Column()
  @IsBoolean()
  verified: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    this.password = await PasswordHelper.hashPassword(this.password);
  }
}
