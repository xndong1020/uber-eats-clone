import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UpdateResult } from 'typeorm';
import { CreateRestaurantDto } from './dtos/CreateRestaurant.dto';
import { QueryRestaurantDto } from './dtos/QueryRestaurant.dto';
import { UpdateRestaurantDto } from './dtos/UpdateRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';
import { RestaurantService } from './restaurants.service';

@Resolver(() => Restaurant)
export class RestaurantResolver {
  constructor(private readonly restaurantService: RestaurantService) {}
  @Query(() => [Restaurant])
  async getRestaurants(
    @Args('filters') filters: QueryRestaurantDto,
  ): Promise<Restaurant[]> {
    return await this.restaurantService.getAll(filters);
  }

  @Mutation(() => Restaurant)
  async createRestaurant(
    @Args('newRestaurant') newRestaurant: CreateRestaurantDto,
  ): Promise<Restaurant> {
    return await this.restaurantService.createRestaurant(newRestaurant);
  }

  @Mutation(() => Restaurant)
  async updateRestaurant(
    @Args('updateRestaurant') updateRestaurant: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    // return await (
    //   await this.restaurantService.updateRestaurant(updateRestaurant)
    // )?.affected;
    return await this.restaurantService.updateRestaurant(updateRestaurant);
  }
}
