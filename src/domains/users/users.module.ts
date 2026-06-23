import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserContactsController } from './user-contacts.controller';
import { UsersService } from './users.service';
import { UserContactsService } from './user-contacts.service';
import { UsersRepository } from './users.repository';
import { UserContactsRepository } from './user-contacts.repository';
import { OutletsModule } from '../outlets/outlets.module';

@Module({
  controllers: [UsersController, UserContactsController],
  providers: [
    UsersService,
    UserContactsService,
    UsersRepository,
    UserContactsRepository,
  ],
  exports: [UsersService, UsersRepository],
  imports: [OutletsModule],
})
export class UsersModule {}
