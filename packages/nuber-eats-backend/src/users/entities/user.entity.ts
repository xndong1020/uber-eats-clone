import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToOne } from 'typeorm';
import { IsBoolean, IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { UserRole } from 'src/common/enums/USER_ROLE.enum';
import { Verification } from './verification.entity';

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'users' })
export class User extends CoreEntity {
  constructor(private readonly jwtService: JwtService) {
    super();
    this.jwtService = new JwtService({
      isGlobal: true,
      secretKey: process.env.SECRET_KEY,
    });
  }

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

  @Field(type => Boolean)
  @Column()
  @IsBoolean()
  verified: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    this.password = await this.jwtService.hashPassword(this.password);
  }
}
