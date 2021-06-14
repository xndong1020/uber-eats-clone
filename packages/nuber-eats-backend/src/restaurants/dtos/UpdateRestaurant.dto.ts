import {
  InputType,
  IntersectionType,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { Restaurant } from '../entities/Restaurants.entity';
import { CreateRestaurantDto } from './CreateRestaurant.dto';

// the update dto type MUST have a id
@InputType()
export class UpdateRestaurantDto extends IntersectionType(
  PickType(Restaurant, ['id'] as const),
  // must be Partial from CreateRestaurantDto, not Restaurant, otherwise the 'id' field will be optional too.
  PartialType(CreateRestaurantDto),
) {}
