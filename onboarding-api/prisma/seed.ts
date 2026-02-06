import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPasswordAdmin = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@portal.com" },
    update: {},
    create: {
      email: "admin@portal.com",
      password: hashedPasswordAdmin,
      role: Role.ADMIN,
    },
  });

    const hashedPasswordViewer = await bcrypt.hash("viewer123", 10);
    const viewer = await prisma.user.upsert({
    where: { email: "viewer@portal.com" },
    update: {},
    create: {
      email: "viewer@portal.com",
      password: hashedPasswordViewer,
      role: Role.VIEWER,
    },
  });

  console.log({ admin });
  console.log({ viewer });
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });