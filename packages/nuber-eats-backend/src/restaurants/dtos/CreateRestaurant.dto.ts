import { InputType, OmitType } from '@nestjs/graphql';
import { Restaurant } from '../entities/Restaurants.entity';

@InputType()
export class CreateRestaurantDto extends OmitType(Restaurant, ['id']) {}
