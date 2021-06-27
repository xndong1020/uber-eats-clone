import { InputType, PickType } from '@nestjs/graphql';
import { Verification } from '../entities/verification.entity';

@InputType()
export class VerifyEmailDto extends PickType(Verification, ['code'] as const) {}
