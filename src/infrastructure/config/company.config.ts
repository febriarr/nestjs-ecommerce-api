import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Informasi perusahaan untuk dokumen (invoice, dll.).
 *
 * Saat ini bersumber dari environment variable (single-company). Bila kelak
 * perlu multi-company, cukup ganti implementasi sumber data di sini tanpa
 * mengubah business logic yang mengonsumsi `CompanyInfo`.
 */
export interface CompanyInfo {
  name: string;
  address: string;
  email: string;
  phone: string;
  logoUrl: string;
}

@Injectable()
export class CompanyConfigService {
  constructor(private readonly config: ConfigService) {}

  getCompanyInfo(): CompanyInfo {
    return {
      name: this.config.getOrThrow<string>('COMPANY_NAME'),
      address: this.config.getOrThrow<string>('COMPANY_ADDRESS'),
      email: this.config.getOrThrow<string>('COMPANY_EMAIL'),
      phone: this.config.getOrThrow<string>('COMPANY_PHONE'),
      logoUrl: this.config.getOrThrow<string>('COMPANY_LOGO_URL'),
    };
  }
}
