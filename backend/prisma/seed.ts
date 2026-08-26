import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'DEMO-MC' },
    update: {},
    create: {
      name: 'Demo Municipal Corporation',
      code: 'DEMO-MC',
      description: 'Demo municipal corporation for testing',
      contactEmail: 'contact@demo-mc.gov',
      contactPhone: '1800-XXX-XXXX',
      status: 'ACTIVE',
    },
  });

  console.log('Created tenant:', tenant.name);

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SANITATION' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Sanitation Department',
        code: 'SANITATION',
        description: 'Handles garbage collection, cleanliness',
      },
    }),
    prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ROADS' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Roads & Buildings',
        code: 'ROADS',
        description: 'Handles road maintenance, construction',
      },
    }),
    prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'WATER' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Water Supply',
        code: 'WATER',
        description: 'Handles water supply and drainage',
      },
    }),
    prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ELECTRICAL' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Electrical Department',
        code: 'ELECTRICAL',
        description: 'Handles street lights, electrical issues',
      },
    }),
    prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'REVENUE' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Revenue Department',
        code: 'REVENUE',
        description: 'Handles property tax, trade licenses',
      },
    }),
  ]);

  console.log('Created departments:', departments.length);

  // Create zones
  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ZONE-1' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Zone 1 - North',
        code: 'ZONE-1',
        description: 'Northern zone',
      },
    }),
    prisma.zone.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ZONE-2' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Zone 2 - South',
        code: 'ZONE-2',
        description: 'Southern zone',
      },
    }),
  ]);

  console.log('Created zones:', zones.length);

  // Create circles
  const circles = await Promise.all([
    prisma.circle.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CIRCLE-1' } },
      update: {},
      create: {
        tenantId: tenant.id,
        zoneId: zones[0]!.id,
        name: 'Circle 1',
        code: 'CIRCLE-1',
      },
    }),
    prisma.circle.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CIRCLE-2' } },
      update: {},
      create: {
        tenantId: tenant.id,
        zoneId: zones[0]!.id,
        name: 'Circle 2',
        code: 'CIRCLE-2',
      },
    }),
  ]);

  console.log('Created circles:', circles.length);

  // Create wards
  const wards = await Promise.all([
    prisma.ward.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'WARD-1' } },
      update: {},
      create: {
        tenantId: tenant.id,
        zoneId: zones[0]!.id,
        circleId: circles[0]!.id,
        name: 'Ward 1 - Central',
        code: 'WARD-1',
        population: 50000,
      },
    }),
    prisma.ward.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'WARD-2' } },
      update: {},
      create: {
        tenantId: tenant.id,
        zoneId: zones[0]!.id,
        circleId: circles[0]!.id,
        name: 'Ward 2 - East',
        code: 'WARD-2',
        population: 45000,
      },
    }),
  ]);

  console.log('Created wards:', wards.length);

  // Hash password
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  // Create super admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@civicops.com' },
    update: {},
    create: {
      email: 'superadmin@civicops.com',
      passwordHash,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('Created super admin:', superAdmin.email);

  // Create municipal admin
  const municipalAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo-mc.gov' },
    update: {},
    create: {
      email: 'admin@demo-mc.gov',
      passwordHash,
      name: 'Municipal Admin',
      role: Role.MUNICIPAL_ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });

  // Create membership
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: municipalAdmin.id, tenantId: tenant.id } },
    update: {},
    create: {
      userId: municipalAdmin.id,
      tenantId: tenant.id,
      role: Role.MUNICIPAL_ADMIN,
      isDefault: true,
    },
  });

  console.log('Created municipal admin:', municipalAdmin.email);

  // Create demo citizen
  const citizenUser = await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: {},
    create: {
      email: 'citizen@example.com',
      passwordHash,
      name: 'Demo Citizen',
      role: Role.CITIZEN,
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });

  const citizen = await prisma.citizen.upsert({
    where: { userId: citizenUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: citizenUser.id,
      name: 'Demo Citizen',
      email: 'citizen@example.com',
      phone: '9876543210',
      address: '123 Main Street, Ward 1',
      wardId: wards[0]!.id,
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: citizenUser.id, tenantId: tenant.id } },
    update: {},
    create: {
      userId: citizenUser.id,
      tenantId: tenant.id,
      role: Role.CITIZEN,
      isDefault: true,
    },
  });

  console.log('Created demo citizen:', citizenUser.email);

  // Create demo officer
  const officerUser = await prisma.user.upsert({
    where: { email: 'officer@demo-mc.gov' },
    update: {},
    create: {
      email: 'officer@demo-mc.gov',
      passwordHash,
      name: 'Demo Officer',
      role: Role.FIELD_OFFICER,
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { userId: officerUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: officerUser.id,
      employeeCode: 'EMP-001',
      name: 'Demo Officer',
      email: 'officer@demo-mc.gov',
      designation: 'Sanitary Inspector',
      departmentId: departments[0]!.id,
      zoneId: zones[0]!.id,
      circleId: circles[0]!.id,
      wardId: wards[0]!.id,
      joiningDate: new Date('2020-01-01'),
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: officerUser.id, tenantId: tenant.id } },
    update: {},
    create: {
      userId: officerUser.id,
      tenantId: tenant.id,
      role: Role.FIELD_OFFICER,
      isDefault: true,
    },
  });

  console.log('Created demo officer:', officerUser.email);

  // Create sample complaints
  const complaints = await Promise.all([
    prisma.complaint.create({
      data: {
        tenantId: tenant.id,
        complaintNumber: 'GRV-2024-0001',
        citizenId: citizen.id,
        category: 'Garbage Collection',
        description: 'Garbage not collected for 3 days in the locality',
        address: '123 Main Street, Ward 1',
        wardId: wards[0]!.id,
        departmentId: departments[0]!.id,
        priority: 'HIGH',
        status: 'CREATED',
        createdById: citizenUser.id,
      },
    }),
    prisma.complaint.create({
      data: {
        tenantId: tenant.id,
        complaintNumber: 'GRV-2024-0002',
        citizenId: citizen.id,
        category: 'Street Light',
        description: 'Street light not working near the park',
        address: '456 Park Avenue, Ward 2',
        wardId: wards[1]!.id,
        departmentId: departments[3]!.id,
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        assignedToId: officerUser.id,
        createdById: citizenUser.id,
      },
    }),
  ]);

  console.log('Created sample complaints:', complaints.length);

  // Create budget allocations
  await Promise.all(
    departments.map((dept) =>
      prisma.budget.upsert({
        where: {
          tenantId_financialYear_departmentId: {
            tenantId: tenant.id,
            financialYear: '2024-25',
            departmentId: dept.id,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          financialYear: '2024-25',
          departmentId: dept.id,
          allocatedAmount: Math.floor(Math.random() * 50000000) + 10000000,
          spentAmount: Math.floor(Math.random() * 5000000),
        },
      })
    )
  );

  console.log('Created budget allocations');

  console.log('Seed completed successfully!');
  console.log('\nDemo Credentials:');
  console.log('================');
  console.log('Super Admin: superadmin@civicops.com / Admin@123');
  console.log('Municipal Admin: admin@demo-mc.gov / Admin@123');
  console.log('Officer: officer@demo-mc.gov / Admin@123');
  console.log('Citizen: citizen@example.com / Admin@123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
