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
  Put,
} from '@nestjs/common';
import { UserContactsService } from './user-contacts.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { assertSelfOrAdmin } from '../auth/authz.util';
import type { SelectUser } from '../../infrastructure/database/schema';
import { CreateContactDTO } from './dto/create-contact.dto';
import { UpdateContactDTO } from './dto/update-contact.dto';
import { ContactResponseDto } from './dto/response-contact.dto';

/**
 * Alamat pengiriman user (user_contacts) — sumber `contactId` untuk checkout.
 * Hanya pemilik (atau admin) yang boleh mengakses alamat seorang user.
 */
@Controller('users/:userId/contacts')
export class UserContactsController {
  constructor(private readonly contactsService: UserContactsService) {}

  @Get()
  async list(
    @CurrentUser() requester: SelectUser,
    @Param('userId', ParseUUIDPipe) userId: string
  ): Promise<ContactResponseDto[]> {
    assertSelfOrAdmin(requester, userId);
    return this.contactsService.list(userId);
  }

  @Get(':contactId')
  async findById(
    @CurrentUser() requester: SelectUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string
  ): Promise<ContactResponseDto> {
    assertSelfOrAdmin(requester, userId);
    return this.contactsService.findById(userId, contactId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() requester: SelectUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateContactDTO
  ): Promise<ContactResponseDto> {
    assertSelfOrAdmin(requester, userId);
    return this.contactsService.create(userId, dto);
  }

  @Patch(':contactId')
  async update(
    @CurrentUser() requester: SelectUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDTO
  ): Promise<ContactResponseDto> {
    assertSelfOrAdmin(requester, userId);
    return this.contactsService.update(userId, contactId, dto);
  }

  /** Jadikan alamat ini default pengiriman (primary lama otomatis di-unset). */
  @Put(':contactId/primary')
  async setPrimary(
    @CurrentUser() requester: SelectUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string
  ): Promise<ContactResponseDto> {
    assertSelfOrAdmin(requester, userId);
    return this.contactsService.setPrimary(userId, contactId);
  }

  @Delete(':contactId')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @CurrentUser() requester: SelectUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string
  ): Promise<void> {
    assertSelfOrAdmin(requester, userId);
    return this.contactsService.softDelete(userId, contactId);
  }
}
