import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { UserQueryDTO } from './dto/user-query.dto';
import { UserResponseDto } from './dto/response-user.dto';
import { SelectUser } from '../../infrastructure/database/schema';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildStringCursorPage,
  decodeStringCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import {
  UserEmailConflictException,
  UserInvalidPasswordException,
  UserNotFoundException,
} from '../../common/exceptions/domains/user.exceptions';

/** Cost factor bcrypt — tuning knob, bukan konfigurasi per-environment. */
const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(dto: CreateUserDTO): Promise<UserResponseDto> {
    if (await this.usersRepository.findByEmail(dto.email)) {
      throw UserEmailConflictException({ details: { email: dto.email } });
    }

    const user = await this.usersRepository.insert({
      email: dto.email,
      name: dto.name,
      password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      phone: dto.phone ?? null,
      avatar: dto.avatar ?? null,
      ...(dto.role !== undefined ? { role: dto.role } : {}),
    });
    return this.toUserResponse(user);
  }

  async findById(id: string): Promise<UserResponseDto> {
    return this.toUserResponse(await this.getUserOrThrow(id));
  }

  async list(query: UserQueryDTO): Promise<WithMetadata<UserResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.usersRepository.list(
      { role: query.role, status: query.status, search: query.search },
      decodeStringCursor(query.cursor),
      limit
    );
    const { items, meta } = buildStringCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map((user) => this.toUserResponse(user)),
      metadata: meta,
    };
  }

  async update(id: string, dto: UpdateUserDTO): Promise<UserResponseDto> {
    await this.getUserOrThrow(id);

    const user = await this.usersRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.notificationPref !== undefined
        ? { notificationPref: dto.notificationPref }
        : {}),
    });
    return this.toUserResponse(user);
  }

  /**
   * Ganti password. Bila user sudah punya password, `currentPassword` wajib
   * dan harus cocok; akun OAuth tanpa password boleh langsung menyetel.
   * `adminReset` melewati verifikasi password lama (reset oleh admin).
   */
  async changePassword(
    id: string,
    dto: ChangePasswordDTO,
    adminReset = false
  ): Promise<void> {
    const user = await this.getUserOrThrow(id);

    if (user.password !== null && !adminReset) {
      const matches =
        dto.currentPassword !== undefined &&
        (await bcrypt.compare(dto.currentPassword, user.password));
      if (!matches) {
        throw UserInvalidPasswordException({ details: { userId: id } });
      }
    }

    await this.usersRepository.update(id, {
      password: await bcrypt.hash(dto.newPassword, SALT_ROUNDS),
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.getUserOrThrow(id);
    await this.usersRepository.softDelete(id);
  }

  // ---------- helpers ----------

  private async getUserOrThrow(id: string): Promise<SelectUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw UserNotFoundException({ details: { id } });
    }
    return user;
  }

  /** Buang field sensitif (password, oauthMetadata) dari response. */
  private toUserResponse(user: SelectUser): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      emailIsVerified: user.emailIsVerified,
      phoneIsVerified: user.phoneIsVerified,
      notificationPref: user.notificationPref,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
