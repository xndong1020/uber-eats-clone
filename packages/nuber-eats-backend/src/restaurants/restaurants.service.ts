import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';

import { CreateRestaurantDto } from './dtos/CreateRestaurant.dto';
import { UpdateRestaurantDto } from './dtos/UpdateRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
  ) {}

  async getAll(filters: Partial<Restaurant>): Promise<Restaurant[]> {
    return await this.restaurantsRepository.find({ ...filters });
  }

  async createRestaurant(
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    // because the schema of CreateRestaurantDto and Restaurant are the same
    const newRestaurant = this.restaurantsRepository.create(
      createRestaurantDto,
    );
    return await this.restaurantsRepository.save(newRestaurant);
  }

  async updateRestaurant(
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    // return await this.restaurantsRepository.update(
    //   { id: updateRestaurantDto.id },
    //   updateRestaurantDto,
    // );
    const restaurantInDb = await this.restaurantsRepository.findOneOrFail({
      id: updateRestaurantDto.id,
    });

    const updated = { ...restaurantInDb, ...updateRestaurantDto };
    return this.restaurantsRepository.save(updated);
  }
}
