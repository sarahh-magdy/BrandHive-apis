import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../models/common/user.repository';
import { UserRole } from '../models/common/user.schema';

@Injectable()
export class AdminSeed implements OnModuleInit {
  constructor(private readonly userRepository: UserRepository) {}

  async onModuleInit() {
  if (process.env.NODE_ENV !== 'development') return;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  if (!adminEmail || !adminPassword) {
    console.warn('Admin seed skipped: missing env variables');
    return;
  }

  const existing = await this.userRepository.findByEmail(adminEmail);

  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await this.userRepository.create({
    name: 'Super Admin',
    email: adminEmail,
    password: hashedPassword,
    role: UserRole.ADMIN,
    isEmailVerified: true,
    isActive: true,
  });

  console.log(`Admin created: ${adminEmail}`);
}
}