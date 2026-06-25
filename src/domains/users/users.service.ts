import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  SelectUserWithAddress,
  SelectUserWithOutlet,
  UsersRepository,
} from './users.repository';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { UserQueryDTO } from './dto/user-query.dto';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildStringCursorPage,
  decodeStringCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import {
  UserEmailConflictException,
  UserInvalidOutletAssignmentException,
  UserInvalidPasswordException,
  UserNotFoundException,
  UserOutletNotFoundException,
} from '../../common/exceptions/domains/user.exceptions';
import { OutletsRepository } from '../outlets/outlets.repository';
import { ResponseMeDTO } from './dto/response-me.dto';
import { UserListResponseDTO } from './dto/response-user-list.dto';
import { ResponseCustomersListDTO } from './dto/response-customers-list.dto';

/** Cost factor bcrypt — tuning knob, bukan konfigurasi per-environment. */
const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly outletsRepository: OutletsRepository
  ) {}

  async createUser(dto: CreateUserDTO): Promise<ResponseMeDTO> {
    if (await this.usersRepository.findByEmail(dto.email)) {
      throw UserEmailConflictException({ details: { email: dto.email } });
    }

    const role = dto.role ?? 'customer';

    const requiresOutlet = ['admin', 'cashier'];
    const forbidsOutlet = ['customer', 'super_admin'];

    if (requiresOutlet.includes(role) && !dto.outletId) {
      throw UserInvalidOutletAssignmentException({
        message: 'Role ini wajib memiliki outlet',
      });
    }

    if (forbidsOutlet.includes(role) && dto.outletId) {
      throw UserInvalidOutletAssignmentException({
        message: 'Role ini tidak boleh memiliki outlet',
      });
    }

    if (dto.outletId) {
      const outlet = await this.outletsRepository.findById(dto.outletId);

      if (!outlet) {
        throw UserOutletNotFoundException();
      }
    }

    const created = await this.usersRepository.insert({
      email: dto.email,
      name: dto.name,
      password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      phone: dto.phone ?? null,
      avatar: dto.avatar ?? null,
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.outletId !== undefined ? { outletId: dto.outletId } : {}),
    });

    const user = await this.getUserOrThrow(created.id);
    return this.mapToUserDetailResponse(user);
  }

  async findById(id: string): Promise<ResponseMeDTO> {
    return this.mapToUserDetailResponse(await this.getUserOrThrow(id));
  }

  async list(
    query: UserQueryDTO
  ): Promise<WithMetadata<UserListResponseDTO[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.usersRepository.list(
      {
        role: query.role,
        status: query.status,
        search: query.search,
        outletId: query.outletId,
      },
      decodeStringCursor(query.cursor),
      limit
    );
    const { items, meta } = buildStringCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map((user) => this.mapToUserListResponse(user)),
      metadata: meta,
    };
  }

  async customerList(
    query: UserQueryDTO
  ): Promise<WithMetadata<ResponseCustomersListDTO[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.usersRepository.customerList(
      {
        role: query.role,
        status: query.status,
        search: query.search,
      },
      decodeStringCursor(query.cursor),
      limit
    );
    const { items, meta } = buildStringCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map((user) => this.mapToCustomerListResponse(user)),
      metadata: meta,
    };
  }

  async update(id: string, dto: UpdateUserDTO): Promise<ResponseMeDTO> {
    const existingUser = await this.getUserOrThrow(id);

    const role = dto.role !== undefined ? dto.role : existingUser.role;

    const outletId =
      dto.outletId !== undefined ? dto.outletId : existingUser.outletId;

    const requiresOutlet = ['admin', 'cashier'];
    const forbidsOutlet = ['customer', 'super_admin'];

    if (requiresOutlet.includes(role) && !outletId) {
      throw UserInvalidOutletAssignmentException({
        message: 'Role ini wajib memiliki outlet',
      });
    }

    if (forbidsOutlet.includes(role) && outletId) {
      throw UserInvalidOutletAssignmentException({
        message: 'Role ini tidak boleh memiliki outlet',
      });
    }

    if (outletId) {
      const outlet = await this.outletsRepository.findById(outletId);

      if (!outlet) {
        throw UserOutletNotFoundException();
      }
    }

    const updated = await this.usersRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.notificationPref !== undefined
        ? { notificationPref: dto.notificationPref }
        : {}),
      ...(dto.outletId !== undefined ? { outletId: dto.outletId } : {}),
    });

    const user = await this.getUserOrThrow(updated.id);
    return this.mapToUserDetailResponse(user);
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

  private async getUserOrThrow(id: string): Promise<SelectUserWithOutlet> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw UserNotFoundException({ details: { id } });
    }
    return user;
  }

  /** Buang field sensitif (password, oauthMetadata) dari response. */
  private mapToUserDetailResponse(user: SelectUserWithOutlet): ResponseMeDTO {
    return new ResponseMeDTO({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      outletId: user.outletId,
      outlet: user.outlet,
      emailIsVerified: user.emailIsVerified,
      phoneIsVerified: user.phoneIsVerified,
      notificationPref: user.notificationPref,
      createdAt: user.createdAt,
    });
  }

  private mapToUserListResponse(
    user: SelectUserWithOutlet
  ): UserListResponseDTO {
    return new UserListResponseDTO({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      outletId: user.outletId,
      outlet: user.outlet,
      createdAt: user.createdAt,
    });
  }

  private mapToCustomerListResponse(
    user: SelectUserWithAddress
  ): ResponseCustomersListDTO {
    return new ResponseCustomersListDTO({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      verified: {
        emailIsVerified: user.emailIsVerified,
        phoneIsVerified: user.phoneIsVerified,
      },
      address: {
        city: user.city,
        province: user.province,
        phone: user.phone,
      },
    });
  }
}
