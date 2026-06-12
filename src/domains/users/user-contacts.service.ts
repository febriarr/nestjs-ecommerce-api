import { Injectable } from '@nestjs/common';
import {
  SelectUserContact,
  UserContactsRepository,
} from './user-contacts.repository';
import { UsersRepository } from './users.repository';
import { CreateContactDTO } from './dto/create-contact.dto';
import { UpdateContactDTO } from './dto/update-contact.dto';
import { ContactResponseDto } from './dto/response-contact.dto';
import {
  UserContactNotFoundException,
  UserNotFoundException,
} from '../../common/exceptions/domains/user.exceptions';

@Injectable()
export class UserContactsService {
  constructor(
    private readonly contactsRepository: UserContactsRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async list(userId: string): Promise<ContactResponseDto[]> {
    await this.assertUser(userId);
    const contacts = await this.contactsRepository.listByUser(userId);
    return contacts.map((contact) => this.toResponse(contact));
  }

  async findById(
    userId: string,
    contactId: string
  ): Promise<ContactResponseDto> {
    await this.assertUser(userId);
    return this.toResponse(await this.getContactOrThrow(userId, contactId));
  }

  /** Alamat pertama user otomatis dijadikan primary. */
  async create(
    userId: string,
    dto: CreateContactDTO
  ): Promise<ContactResponseDto> {
    await this.assertUser(userId);

    const existing = await this.contactsRepository.listByUser(userId);
    const isPrimary = existing.length === 0 ? true : (dto.isPrimary ?? false);

    const contact = await this.contactsRepository.insert({
      userId,
      label: dto.label ?? null,
      recipientName: dto.recipientName,
      phone: dto.phone,
      phoneAlt: dto.phoneAlt ?? null,
      street: dto.street,
      district: dto.district,
      city: dto.city,
      province: dto.province,
      postalCode: dto.postalCode,
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      notes: dto.notes ?? null,
      isPrimary,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return this.toResponse(contact);
  }

  async update(
    userId: string,
    contactId: string,
    dto: UpdateContactDTO
  ): Promise<ContactResponseDto> {
    await this.assertUser(userId);
    await this.getContactOrThrow(userId, contactId);

    const contact = await this.contactsRepository.update(contactId, userId, {
      ...(dto.label !== undefined ? { label: dto.label } : {}),
      ...(dto.recipientName !== undefined
        ? { recipientName: dto.recipientName }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.phoneAlt !== undefined ? { phoneAlt: dto.phoneAlt } : {}),
      ...(dto.street !== undefined ? { street: dto.street } : {}),
      ...(dto.district !== undefined ? { district: dto.district } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.province !== undefined ? { province: dto.province } : {}),
      ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return this.toResponse(contact);
  }

  async setPrimary(
    userId: string,
    contactId: string
  ): Promise<ContactResponseDto> {
    await this.assertUser(userId);
    await this.getContactOrThrow(userId, contactId);
    const contact = await this.contactsRepository.setPrimary(contactId, userId);
    return this.toResponse(contact);
  }

  async softDelete(userId: string, contactId: string): Promise<void> {
    await this.assertUser(userId);
    await this.getContactOrThrow(userId, contactId);
    await this.contactsRepository.softDelete(contactId);
  }

  // ---------- helpers ----------

  private async assertUser(userId: string): Promise<void> {
    if (!(await this.usersRepository.findById(userId))) {
      throw UserNotFoundException({ details: { userId } });
    }
  }

  private async getContactOrThrow(
    userId: string,
    contactId: string
  ): Promise<SelectUserContact> {
    const contact = await this.contactsRepository.findById(contactId, userId);
    if (!contact) {
      throw UserContactNotFoundException({ details: { userId, contactId } });
    }
    return contact;
  }

  private toResponse(contact: SelectUserContact): ContactResponseDto {
    return new ContactResponseDto({
      id: contact.id,
      userId: contact.userId,
      label: contact.label,
      recipientName: contact.recipientName,
      phone: contact.phone,
      phoneAlt: contact.phoneAlt,
      street: contact.street,
      district: contact.district,
      city: contact.city,
      province: contact.province,
      postalCode: contact.postalCode,
      country: contact.country,
      latitude: contact.latitude,
      longitude: contact.longitude,
      notes: contact.notes,
      isPrimary: contact.isPrimary,
      isActive: contact.isActive,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    });
  }
}
