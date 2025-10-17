// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing existing data...');
  // The order matters: delete records that depend on others first.
  await prisma.job.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Database cleared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 