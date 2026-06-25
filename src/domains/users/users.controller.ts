import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { assertSelfOrAdmin, isAdmin } from '../auth/authz.util';
import type { SelectUser } from '../../infrastructure/database/schema';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { UserQueryDTO } from './dto/user-query.dto';
import { WithMetadata } from '../../common/types/api-response.type';
import { AuthForbiddenException } from '../../common/exceptions/domains/auth.exceptions';
import { ResponseCustomersListDTO } from './dto/response-customers-list.dto';
import { UserListResponseDTO } from './dto/response-user-list.dto';
import { ResponseMeDTO } from './dto/response-me.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'super_admin')
  async list(
    @Query() query: UserQueryDTO
  ): Promise<WithMetadata<UserListResponseDTO[]>> {
    return this.usersService.list(query);
  }
  @Get()
  @Roles('admin', 'super_admin')
  async customerList(
    @Query() query: UserQueryDTO
  ): Promise<WithMetadata<ResponseCustomersListDTO[]>> {
    return this.usersService.customerList(query);
  }

  /** Profil sendiri, atau user mana pun bila admin. */
  @Get(':id')
  async findById(
    @CurrentUser() requester: SelectUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ResponseMeDTO> {
    assertSelfOrAdmin(requester, id);
    return this.usersService.findById(id);
  }

  /** Pembuatan user internal (boleh set role) — registrasi publik via /auth/register. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'super_admin')
  async create(@Body() dto: CreateUserDTO): Promise<ResponseMeDTO> {
    return this.usersService.createUser(dto);
  }

  /** Update profil sendiri; role/status hanya boleh diubah admin. */
  @Patch(':id')
  async update(
    @CurrentUser() requester: SelectUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDTO
  ): Promise<ResponseMeDTO> {
    assertSelfOrAdmin(requester, id);
    if (
      (dto.role !== undefined || dto.status !== undefined) &&
      !isAdmin(requester)
    ) {
      throw AuthForbiddenException({
        details: { reason: 'role/status hanya boleh diubah admin' },
      });
    }
    return this.usersService.update(id, dto);
  }

  /**
   * Ganti password sendiri (wajib currentPassword); admin boleh me-reset
   * password user lain tanpa currentPassword.
   */
  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() requester: SelectUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDTO
  ): Promise<void> {
    assertSelfOrAdmin(requester, id);
    const adminReset = isAdmin(requester) && requester.id !== id;
    return this.usersService.changePassword(id, dto, adminReset);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'super_admin')
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.softDelete(id);
  }
}
