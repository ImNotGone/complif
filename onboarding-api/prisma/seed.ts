import { PrismaClient, Role, BusinessStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const ADMIN_ID = 'ffbded62-e361-4495-89d3-661f545b0093';

const HIGH_RISK_COUNTRIES = ['PA', 'VG', 'KY', 'CH', 'LI', 'MC'];
const HIGH_RISK_INDUSTRIES = ['construction', 'security', 'casino', 'money_exchange', 'gambling', 'cryptocurrency'];

function calculateRiskForSeed(country: string, industry: string) {
  const countryRisk = HIGH_RISK_COUNTRIES.includes(country) ? 40 : 0;
  const industryRisk = HIGH_RISK_INDUSTRIES.includes(industry) ? 30 : 0;
  const documentRisk = 20; // All seed data has 0 docs

  return {
    countryRisk,
    industryRisk,
    documentRisk,
    totalScore: Math.min(countryRisk + industryRisk + documentRisk, 100),
    metadata: {
      highRiskCountry: countryRisk > 0,
      highRiskIndustry: industryRisk > 0,
      missingDocuments: ["TAX_CERTIFICATE", "REGISTRATION", "INSURANCE_POLICY"],
      documentCompleteness: 0
    }
  };
}

const businessesData = [
  { id: "25ea4c60-ed02-4ba7-96b9-d5c75cc4a9b9", name: "Pacífico Seguros SpA", taxId: "96.728.413-5", country: "CL", industry: "insurance", status: "PENDING", riskScore: 20, createdAt: "2026-02-08T00:14:16.470Z" },
  { id: "21d65e2d-10e0-463e-84d3-128b29758745", name: "Andes Retail Group", taxId: "76.394.851-2", country: "CL", industry: "retail", status: "PENDING", riskScore: 20, createdAt: "2026-02-08T00:14:11.045Z" },
  { id: "98d8d23f-1d3c-4695-9bb8-8d16b00e6594", name: "Golden State Foods Inc", taxId: "83-1948572", country: "US", industry: "food", status: "PENDING", riskScore: 20, createdAt: "2026-02-08T00:13:49.664Z" },
  { id: "43768307-d372-4f83-bba8-91765bb501ed", name: "Liberty Insurance Group", taxId: "94-7283916", country: "US", industry: "insurance", status: "PENDING", riskScore: 20, createdAt: "2026-02-08T00:13:45.194Z" },
  { id: "6dc23b02-734a-4041-b8de-1faed46ce77d", name: "Swiss Alpine Construction", taxId: "CHE-739.284.116", country: "CH", industry: "construction", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:13:36.095Z" },
  { id: "6084f5fc-6f93-47d6-b34b-cc1ea77ca7a5", name: "Zurich Media House", taxId: "CHE-412.839.504", country: "CH", industry: "media", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:13:19.156Z" },
  { id: "0a88ef7c-ec9e-4618-ada7-2da43667a732", name: "Brasil Exchange Corp", taxId: "62.948.173/0001-09", country: "BR", industry: "money_exchange", status: "PENDING", riskScore: 50, createdAt: "2026-02-08T00:13:05.731Z" },
  { id: "67c29c18-5045-44c2-9292-f774c585ca60", name: "São Paulo Retail Group", taxId: "45.738.291/0001-62", country: "BR", industry: "retail", status: "PENDING", riskScore: 20, createdAt: "2026-02-08T00:13:00.069Z" },
  { id: "5d5a3e24-a924-403c-b6dd-1b4827b1530d", name: "Montevideo Secure Services", taxId: "217394850015", country: "UY", industry: "security", status: "PENDING", riskScore: 50, createdAt: "2026-02-08T00:12:52.846Z" },
  { id: "19751e89-e8e2-4aeb-b80d-5fffadf5e62a", name: "Río Plata Software", taxId: "214587630019", country: "UY", industry: "software", status: "PENDING", riskScore: 20, createdAt: "2026-02-08T00:12:46.617Z" },
  { id: "60dd4ea1-d81c-48c9-b772-da047c2862f6", name: "Azur Construction Group", taxId: "MC-664839", country: "MC", industry: "construction", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:12:01.466Z" },
  { id: "d8534d8c-1bbc-4af4-b9da-a8cb522cdd94", name: "Monte Carlo Software Labs", taxId: "MC-918273", country: "MC", industry: "software", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:55.646Z" },
  { id: "0c687769-213a-4a61-8dc1-f00004a86ac3", name: "Monaco Prestige Retail", taxId: "MC-572839", country: "MC", industry: "retail", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:46.397Z" },
  { id: "86c0fafe-77ed-46f1-bd0f-64a87a8835b2", name: "Liechtenstein Secure AG", taxId: "FL-948372-2", country: "LI", industry: "security", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:11:41.174Z" },
  { id: "f5811c4d-12b4-423e-9bf7-4323bf6767ef", name: "Vaduz Gourmet Foods", taxId: "FL-384756-9", country: "LI", industry: "food", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:35.574Z" },
  { id: "27c45ee6-1e65-407b-8151-4a546c89ce6f", name: "Alpine Media Network", taxId: "CHE-203.948.561", country: "CH", industry: "media", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:26.657Z" },
  { id: "795cdb33-2810-43ce-9c22-14f8fc097498", name: "Helvetia Risk Insurance", taxId: "CHE-109.384.756", country: "CH", industry: "insurance", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:18.852Z" },
  { id: "bc642ab0-288b-4dc9-873d-6d763b2b34f6", name: "Blue Reef Software Ltd", taxId: "KY-563920", country: "KY", industry: "software", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:11.451Z" },
  { id: "f4bfe94f-cfa7-482f-906e-b2b08a07824c", name: "Cayman Retail Group", taxId: "KY-847362", country: "KY", industry: "retail", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:11:04.095Z" },
  { id: "34b30a03-89a1-41af-9e4d-7e476475c907", name: "Island Exchange Ltd", taxId: "VG-294857", country: "VG", industry: "money_exchange", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:10:57.514Z" },
  { id: "b0545ca4-730a-459c-9066-159937338726", name: "Caribbean Gaming Holdings", taxId: "VG-938475", country: "VG", industry: "casino", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:10:50.938Z" },
  { id: "3eef3b5c-4382-446a-a8a0-7bf997616efa", name: "Canal Secure Services", taxId: "1556790-1-2024", country: "PA", industry: "security", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:10:43.788Z" },
  { id: "1eaec185-2936-457c-9684-1b9603ca89f4", name: "Isthmus Build Group", taxId: "1556789-1-2024", country: "PA", industry: "construction", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:10:36.845Z" },
  { id: "0db20a72-d951-4c3a-9903-c0d84ea94ee0", name: "Nestlé", taxId: "CHE-105.909.036", country: "CH", industry: "food", status: "PENDING", riskScore: 60, createdAt: "2026-02-08T00:07:34.794Z" },
  { id: "b28f6116-2793-4d06-9714-4ccfbcd2ae93", name: "BINANCE", taxId: "nan", country: "KY", industry: "cryptocurrency", status: "IN_REVIEW", riskScore: 90, createdAt: "2026-02-08T00:03:49.494Z" },
  { id: "094627d9-a803-4daa-888d-e51c810f50ab", name: "SUPERMERCADOS MAYORISTAS MAKRO S. A", taxId: "30589621499", country: "AR", industry: "retail", status: "PENDING", riskScore: 20, createdAt: "2026-02-07T23:58:22.795Z" },
  { id: "4e346e34-32ec-479c-87a6-b7e0ceb6b7a4", name: "BAUTEC SA", taxId: "30637810290", country: "AR", industry: "construction", status: "PENDING", riskScore: 50, createdAt: "2026-02-07T23:55:35.420Z" },
  { id: "3f945b6c-97eb-4a48-a95b-7bbc426b1fa0", name: "SECURITAS AB", taxId: "30707432043", country: "AR", industry: "security", status: "PENDING", riskScore: 50, createdAt: "2026-02-07T23:51:59.067Z" },
  { id: "50d91f9f-4b69-4460-b3a0-69b77b4865c4", name: "SA LA NACION", taxId: "30500089624", country: "AR", industry: "media", status: "PENDING", riskScore: 20, createdAt: "2026-02-07T23:42:45.079Z" },
  { id: "ea7e80a6-afd2-41af-b59c-c80f4ba015a6", name: "ZURICH CIA DE SEGUROS", taxId: "30500060960", country: "AR", industry: "insurance", status: "PENDING", riskScore: 20, createdAt: "2026-02-07T23:40:53.098Z" }
];

const statusHistoryData = [
  { id: "87d60fa7-c2a2-46d4-b9a8-525f9794e9f7", businessId: "ea7e80a6-afd2-41af-b59c-c80f4ba015a6", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-07T23:40:53.098Z" },
  { id: "a3b96c18-6843-44b8-9842-8ea712425693", businessId: "50d91f9f-4b69-4460-b3a0-69b77b4865c4", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-07T23:42:45.079Z" },
  { id: "bc3793e6-b00b-4acc-b28c-118e56fa4334", businessId: "3f945b6c-97eb-4a48-a95b-7bbc426b1fa0", status: "PENDING", reason: "Initial creation. Risk Score: 50", createdAt: "2026-02-07T23:51:59.067Z" },
  { id: "5c33e806-7144-4792-b4e4-fa26ec43deec", businessId: "4e346e34-32ec-479c-87a6-b7e0ceb6b7a4", status: "PENDING", reason: "Initial creation. Risk Score: 50", createdAt: "2026-02-07T23:55:35.420Z" },
  { id: "9c7130df-daea-4ec2-b168-2125e4127083", businessId: "094627d9-a803-4daa-888d-e51c810f50ab", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-07T23:58:22.795Z" },
  { id: "a822b917-735d-4ad0-92bc-2334a8c3f413", businessId: "b28f6116-2793-4d06-9714-4ccfbcd2ae93", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:03:49.494Z" },
  { id: "5caea1cf-0d8c-4d05-b7c2-3fcc1f91101c", businessId: "0db20a72-d951-4c3a-9903-c0d84ea94ee0", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:07:34.794Z" },
  { id: "b8e6b0af-34c7-41b1-94aa-a3c23cb15787", businessId: "1eaec185-2936-457c-9684-1b9603ca89f4", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:10:36.845Z" },
  { id: "87d7f30c-dc34-481e-a77a-c21a02b29570", businessId: "3eef3b5c-4382-446a-a8a0-7bf997616efa", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:10:43.788Z" },
  { id: "3e4620b2-be81-4a8b-b3e3-a0be7b541bc3", businessId: "b0545ca4-730a-459c-9066-159937338726", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:10:50.938Z" },
  { id: "d70a4d60-cb56-4cba-8c83-618e7704c960", businessId: "34b30a03-89a1-41af-9e4d-7e476475c907", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:10:57.514Z" },
  { id: "87ef1a76-75a1-42f6-b749-af56c7d1c930", businessId: "f4bfe94f-cfa7-482f-906e-b2b08a07824c", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:04.095Z" },
  { id: "b21a1f81-c341-475e-989c-2dd98807520c", businessId: "bc642ab0-288b-4dc9-873d-6d763b2b34f6", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:11.451Z" },
  { id: "5fd598ea-87c0-40ac-a854-dad45a89a504", businessId: "795cdb33-2810-43ce-9c22-14f8fc097498", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:18.852Z" },
  { id: "8ed81c71-5a78-4bf3-9358-0d66c5166bd8", businessId: "27c45ee6-1e65-407b-8151-4a546c89ce6f", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:26.657Z" },
  { id: "54dee3c3-0edc-43e7-b5c8-eb812566243c", businessId: "f5811c4d-12b4-423e-9bf7-4323bf6767ef", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:35.574Z" },
  { id: "19694a7d-2178-4a70-8552-70ed939be9bb", businessId: "86c0fafe-77ed-46f1-bd0f-64a87a8835b2", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:11:41.174Z" },
  { id: "65c6701b-eb25-4545-b323-bcfc3152796b", businessId: "0c687769-213a-4a61-8dc1-f00004a86ac3", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:46.397Z" },
  { id: "826c2904-fd66-46e4-a2a4-aa8676024458", businessId: "d8534d8c-1bbc-4af4-b9da-a8cb522cdd94", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:11:55.646Z" },
  { id: "c9a951c6-6cae-4bff-9d60-55fe624c0084", businessId: "60dd4ea1-d81c-48c9-b772-da047c2862f6", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:12:01.466Z" },
  { id: "180453ee-c45f-4e2f-88fd-acbf5bbcd386", businessId: "19751e89-e8e2-4aeb-b80d-5fffadf5e62a", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-08T00:12:46.617Z" },
  { id: "d845e543-ed9d-4d4b-80de-09d90add6ad5", businessId: "5d5a3e24-a924-403c-b6dd-1b4827b1530d", status: "PENDING", reason: "Initial creation. Risk Score: 50", createdAt: "2026-02-08T00:12:52.846Z" },
  { id: "b69d7360-4177-40ec-9b9a-04389901baa4", businessId: "67c29c18-5045-44c2-9292-f774c585ca60", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-08T00:13:00.069Z" },
  { id: "952b5b78-e0e0-4ae6-8d8d-53ff2afac9f0", businessId: "0a88ef7c-ec9e-4618-ada7-2da43667a732", status: "PENDING", reason: "Initial creation. Risk Score: 50", createdAt: "2026-02-08T00:13:05.731Z" },
  { id: "c9105a15-9f97-447b-84ca-4d410b18ca7c", businessId: "6084f5fc-6f93-47d6-b34b-cc1ea77ca7a5", status: "PENDING", reason: "Initial creation. Risk Score: 60", createdAt: "2026-02-08T00:13:19.156Z" },
  { id: "71b9b222-3b6d-4bcd-9267-a704b92f52da", businessId: "6dc23b02-734a-4041-b8de-1faed46ce77d", status: "IN_REVIEW", reason: "Initial creation. Risk Score: 90", createdAt: "2026-02-08T00:13:36.095Z" },
  { id: "465bb43f-1f1c-4843-807f-94067535ad54", businessId: "43768307-d372-4f83-bba8-91765bb501ed", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-08T00:13:45.194Z" },
  { id: "9dde1bd3-8701-489a-a8ee-9745cebd14e3", businessId: "98d8d23f-1d3c-4695-9bb8-8d16b00e6594", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-08T00:13:49.664Z" },
  { id: "21d65e2d-10e0-463e-84d3-128b29758745", businessId: "21d65e2d-10e0-463e-84d3-128b29758745", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-08T00:14:11.045Z" },
  { id: "25ea4c60-ed02-4ba7-96b9-d5c75cc4a9b9", businessId: "25ea4c60-ed02-4ba7-96b9-d5c75cc4a9b9", status: "PENDING", reason: "Initial creation. Risk Score: 20", createdAt: "2026-02-08T00:14:16.470Z" }
];

async function main() {
  console.log('Starting restoration seed...');

  console.log('Cleaning database...');
  await prisma.statusHistory.deleteMany();
  await prisma.riskCalculation.deleteMany();
  await prisma.document.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const hashedPasswordAdmin = await bcrypt.hash('complif_admin', 10);
  const hashedPasswordViewer = await bcrypt.hash('complif_viewer', 10);

  const admin = await prisma.user.create({
    data: {
      id: ADMIN_ID,
      email: 'admin@complif.com',
      password: hashedPasswordAdmin,
      role: Role.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: 'viewer@complif.com',
      password: hashedPasswordViewer,
      role: Role.VIEWER,
    },
  });

  console.log(`Users seeded (Admin ID: ${admin.id})`);

  console.log('Seeding businesses & reconstructing risk tables...');

  for (const b of businessesData) {
    const riskDetails = calculateRiskForSeed(b.country, b.industry);

    await prisma.business.create({
      data: {
        id: b.id,
        name: b.name,
        taxId: b.taxId,
        country: b.country,
        industry: b.industry,
        status: b.status as BusinessStatus,
        riskScore: b.riskScore,
        createdById: ADMIN_ID,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.createdAt),
        riskCalculations: {
            create: {
                totalScore: riskDetails.totalScore,
                countryRisk: riskDetails.countryRisk,
                industryRisk: riskDetails.industryRisk,
                documentRisk: riskDetails.documentRisk,
                metadata: riskDetails.metadata,
                createdAt: new Date(b.createdAt)
            }
        }
      }
    });
  }
  console.log(`${businessesData.length} Businesses restored`);

  console.log('Restoring status history...');
  for (const h of statusHistoryData) {
    await prisma.statusHistory.create({
      data: {
        id: h.id,
        businessId: h.businessId,
        status: h.status as BusinessStatus,
        changedById: ADMIN_ID,
        reason: h.reason,
        createdAt: new Date(h.createdAt)
      }
    });
  }
  console.log(`${statusHistoryData.length} Status History entries restored`);
}

main()
  .catch((e) => {
    console.error('Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });