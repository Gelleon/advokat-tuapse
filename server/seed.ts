import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  // Удаляем старых пользователей, чтобы оставался только один актуальный админ
  await prisma.admin.deleteMany();
  
  await prisma.admin.create({
    data: {
      username: adminUsername,
      password: hashedPassword,
    },
  });
  
  console.log(`Admin user '${adminUsername}' seeded/updated successfully`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });