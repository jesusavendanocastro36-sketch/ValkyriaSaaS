import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const ej = await (prisma as any).ejercicioRV.count();
  const pr = await (prisma as any).protocoloRV.count();
  console.log('EjercicioRV rows:', ej);
  console.log('ProtocoloRV rows:', pr);
}

main().catch(console.error).finally(() => prisma.$disconnect());
