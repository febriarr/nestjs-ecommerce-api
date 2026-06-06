import { Injectable } from '@nestjs/common';
import { type CreateUserDto } from './users.dto';
import * as bcrypt from 'bcrypt';
import { SelectUser } from '../../infrastructure/database/schema/users.entity';
import { UsersRepository } from './users.repository';

export type SafeUser = Omit<SelectUser, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  private excludePassword(user: SelectUser): SafeUser {
    const { password: _password, ...rest } = user;
    return rest;
  }

  async createUser(dto: CreateUserDto): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const newUser = await this.usersRepository.insert({
      ...dto,
      password: hashedPassword,
    });

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return this.excludePassword(newUser);
  }
}
