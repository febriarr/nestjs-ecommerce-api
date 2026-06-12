import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserContactsController } from './user-contacts.controller';
import { UsersService } from './users.service';
import { UserContactsService } from './user-contacts.service';
import { UsersRepository } from './users.repository';
import { UserContactsRepository } from './user-contacts.repository';

@Module({
  controllers: [UsersController, UserContactsController],
  providers: [
    UsersService,
    UserContactsService,
    UsersRepository,
    UserContactsRepository,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
