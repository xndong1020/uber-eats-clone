import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { BeforeInsert, Column, Entity } from 'typeorm';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { UserRole } from 'src/common/enums/USER_ROLE.enum';

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'users' })
export class User extends CoreEntity {
  constructor(private readonly jwtService: JwtService) {
    super();
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

  @BeforeInsert()
  async hashPassword() {
    this.password = await this.jwtService.hashPassword(this.password);
  }
}
