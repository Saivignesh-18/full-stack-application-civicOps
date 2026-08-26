import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Load env from backend folder if not already loaded
if (!process.env.DATABASE_URL) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
}

const prisma = new PrismaClient();

// Helper to generate random number between min and max
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random item from array
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate date within range
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate complaint number
const generateComplaintNumber = (index: number) => {
  const year = new Date().getFullYear();
  return `GRV-${year}-${String(index).padStart(5, '0')}`;
};

// Generate license number
const generateLicenseNumber = (index: number) => {
  const year = new Date().getFullYear();
  return `TL-${year}-${String(index).padStart(4, '0')}`;
};

// Generate property ID
const generatePropertyId = (wardCode: string, index: number) => {
  return `PROP-${wardCode}-${String(index).padStart(4, '0')}`;
};

async function main() {
  console.log('Seeding database with realistic mock data...');

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.contractPayment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.buildingWorkflowStep.deleteMany();
  await prisma.buildingApplication.deleteMany();
  await prisma.licenseWorkflowStep.deleteMany();
  await prisma.tradeLicense.deleteMany();
  await prisma.propertyTaxPayment.deleteMany();
  await prisma.property.deleteMany();
  await prisma.complaintEvent.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.citizen.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.circle.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.department.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Hash password for all users
  const passwordHash = await bcrypt.hash('Password@123', 12);

  // ============================================
  // 1. Create Tenant (Municipality)
  // ============================================
  console.log('Creating tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Greater Hyderabad Municipal Corporation',
      code: 'GHMC',
      description: 'Municipal corporation of Hyderabad, Telangana',
      address: 'Tank Bund Road, Hyderabad, Telangana 500063',
      contactEmail: 'commissioner@ghmc.gov.in',
      contactPhone: '040-23261750',
      website: 'https://www.ghmc.gov.in',
      status: 'ACTIVE',
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
      },
    },
  });

  // ============================================
  // 2. Create Departments
  // ============================================
  console.log('Creating departments...');
  const departmentData = [
    { name: 'Engineering', code: 'ENG', description: 'Roads, bridges, and infrastructure' },
    { name: 'Town Planning', code: 'TP', description: 'Urban planning and building permissions' },
    { name: 'Revenue', code: 'REV', description: 'Property tax and revenue collection' },
    { name: 'Health & Sanitation', code: 'HEALTH', description: 'Public health and sanitation services' },
    { name: 'Solid Waste Management', code: 'SWM', description: 'Garbage collection and disposal' },
    { name: 'Street Lighting', code: 'LIGHT', description: 'Street lights maintenance' },
    { name: 'Water Supply', code: 'WATER', description: 'Water supply and drainage' },
    { name: 'Parks & Gardens', code: 'PARKS', description: 'Public parks and green spaces' },
    { name: 'Trade License', code: 'LICENSE', description: 'Trade and business licensing' },
    { name: 'Encroachment', code: 'ENCR', description: 'Anti-encroachment cell' },
  ];

  const departments = await Promise.all(
    departmentData.map((dept) =>
      prisma.department.create({
        data: { ...dept, tenantId: tenant.id },
      })
    )
  );

  // ============================================
  // 3. Create Zones, Circles, and Wards
  // ============================================
  console.log('Creating zones, circles, and wards...');
  const zoneData = [
    { name: 'Charminar Zone', code: 'CHR' },
    { name: 'Khairatabad Zone', code: 'KHB' },
    { name: 'Secunderabad Zone', code: 'SEC' },
    { name: 'L.B. Nagar Zone', code: 'LBN' },
    { name: 'Kukatpally Zone', code: 'KKP' },
    { name: 'Serilingampally Zone', code: 'SLP' },
  ];

  const zones = [];
  const circles = [];
  const wards = [];

  for (const zData of zoneData) {
    const zone = await prisma.zone.create({
      data: { ...zData, tenantId: tenant.id },
    });
    zones.push(zone);

    // Create 2 circles per zone
    for (let c = 1; c <= 2; c++) {
      const circle = await prisma.circle.create({
        data: {
          tenantId: tenant.id,
          zoneId: zone.id,
          name: `${zData.name} Circle ${c}`,
          code: `${zData.code}-C${c}`,
        },
      });
      circles.push(circle);

      // Create 3 wards per circle
      for (let w = 1; w <= 3; w++) {
        const wardNum = (zoneData.indexOf(zData) * 6) + ((c - 1) * 3) + w;
        const ward = await prisma.ward.create({
          data: {
            tenantId: tenant.id,
            zoneId: zone.id,
            circleId: circle.id,
            name: `Ward ${wardNum}`,
            code: `W${String(wardNum).padStart(3, '0')}`,
            population: randomInt(15000, 50000),
            area: randomInt(2, 8),
          },
        });
        wards.push(ward);
      }
    }
  }

  // ============================================
  // 4. Create Admin Users
  // ============================================
  console.log('Creating admin users...');

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@ghmc.gov.in',
      passwordHash,
      name: 'Super Administrator',
      phone: '9900000001',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });

  // Municipal Admin
  const municipalAdmin = await prisma.user.create({
    data: {
      email: 'admin@ghmc.gov.in',
      passwordHash,
      name: 'Rajesh Kumar Sharma',
      phone: '9900000002',
      role: 'MUNICIPAL_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });

  // Commissioner
  const commissioner = await prisma.user.create({
    data: {
      email: 'commissioner@ghmc.gov.in',
      passwordHash,
      name: 'Dr. Lokesh Chandra IAS',
      phone: '9900000003',
      role: 'COMMISSIONER',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });

  // ============================================
  // 5. Create Employees
  // ============================================
  console.log('Creating employees...');
  const employeeNames = [
    { name: 'Suresh Reddy', email: 'suresh.reddy@ghmc.gov.in', designation: 'Zonal Commissioner' },
    { name: 'Priya Sharma', email: 'priya.sharma@ghmc.gov.in', designation: 'Deputy Commissioner' },
    { name: 'Mohammed Irfan', email: 'mohammed.irfan@ghmc.gov.in', designation: 'Executive Engineer' },
    { name: 'Lakshmi Devi', email: 'lakshmi.devi@ghmc.gov.in', designation: 'Town Planning Officer' },
    { name: 'Venkat Rao', email: 'venkat.rao@ghmc.gov.in', designation: 'Revenue Officer' },
    { name: 'Srinivas Murthy', email: 'srinivas.murthy@ghmc.gov.in', designation: 'Health Officer' },
    { name: 'Anjali Gupta', email: 'anjali.gupta@ghmc.gov.in', designation: 'Sanitary Inspector' },
    { name: 'Ravi Kumar', email: 'ravi.kumar@ghmc.gov.in', designation: 'Junior Engineer' },
    { name: 'Deepa Nair', email: 'deepa.nair@ghmc.gov.in', designation: 'License Inspector' },
    { name: 'Arun Prakash', email: 'arun.prakash@ghmc.gov.in', designation: 'Field Officer' },
    { name: 'Kavitha Menon', email: 'kavitha.menon@ghmc.gov.in', designation: 'Assistant Engineer' },
    { name: 'Ramesh Babu', email: 'ramesh.babu@ghmc.gov.in', designation: 'Tax Collector' },
    { name: 'Sunitha Rani', email: 'sunitha.rani@ghmc.gov.in', designation: 'Ward Officer' },
    { name: 'Naresh Kumar', email: 'naresh.kumar@ghmc.gov.in', designation: 'Building Inspector' },
    { name: 'Padma Sri', email: 'padma.sri@ghmc.gov.in', designation: 'Accounts Officer' },
  ];

  const employees = [];
  const roles = ['ZONAL_OFFICER', 'DEPARTMENT_OFFICER', 'FIELD_OFFICER', 'EMPLOYEE'];

  for (let i = 0; i < employeeNames.length; i++) {
    const emp = employeeNames[i];
    const user = await prisma.user.create({
      data: {
        email: emp.email,
        passwordHash,
        name: emp.name,
        phone: `99000${String(10 + i).padStart(5, '0')}`,
        role: roles[i % roles.length] as any,
        status: 'ACTIVE',
        emailVerified: true,
        tenantId: tenant.id,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        employeeCode: `EMP${String(1001 + i).padStart(5, '0')}`,
        name: emp.name,
        email: emp.email,
        phone: user.phone,
        designation: emp.designation,
        departmentId: departments[i % departments.length].id,
        zoneId: zones[i % zones.length].id,
        status: 'ACTIVE',
        joiningDate: randomDate(new Date('2018-01-01'), new Date('2023-12-31')),
      },
    });
    employees.push({ user, employee });
  }

  // ============================================
  // 6. Create Citizens
  // ============================================
  console.log('Creating citizens...');
  const citizenNames = [
    { name: 'Sanjay Patel', email: 'sanjay.patel@gmail.com' },
    { name: 'Meera Krishnan', email: 'meera.krishnan@gmail.com' },
    { name: 'Abdul Rahman', email: 'abdul.rahman@yahoo.com' },
    { name: 'Rekha Singh', email: 'rekha.singh@outlook.com' },
    { name: 'Gopal Reddy', email: 'gopal.reddy@gmail.com' },
    { name: 'Fatima Begum', email: 'fatima.begum@gmail.com' },
    { name: 'Vijay Kumar', email: 'vijay.kumar@hotmail.com' },
    { name: 'Anita Desai', email: 'anita.desai@gmail.com' },
    { name: 'Rajendra Prasad', email: 'rajendra.prasad@yahoo.com' },
    { name: 'Sumathi Rao', email: 'sumathi.rao@gmail.com' },
    { name: 'Imran Khan', email: 'imran.khan@outlook.com' },
    { name: 'Savitri Devi', email: 'savitri.devi@gmail.com' },
    { name: 'Harish Chandra', email: 'harish.chandra@gmail.com' },
    { name: 'Lakshmi Narayana', email: 'lakshmi.narayana@yahoo.com' },
    { name: 'Praveena Kumari', email: 'praveena.kumari@gmail.com' },
    { name: 'Shyam Sundar', email: 'shyam.sundar@gmail.com' },
    { name: 'Zarina Khatun', email: 'zarina.khatun@outlook.com' },
    { name: 'Ramana Murthy', email: 'ramana.murthy@gmail.com' },
    { name: 'Bhagyalakshmi', email: 'bhagyalakshmi@yahoo.com' },
    { name: 'Naveen Reddy', email: 'naveen.reddy@gmail.com' },
  ];

  const addresses = [
    '12-3-456, Tarnaka, Secunderabad',
    '4-5-67/A, Sultan Bazaar, Koti',
    '8-2-293/1, Road No. 12, Banjara Hills',
    '1-8-702, Ashok Nagar, Habsiguda',
    '3-6-289, Himayatnagar, Hyderabad',
    '6-3-866, Ameerpet, Hyderabad',
    '10-2-289, Mehdipatnam, Hyderabad',
    '5-9-22, Basheerbagh, Hyderabad',
    '11-4-651, AC Guards, Hyderabad',
    '7-1-21/3, Ameerpet, Hyderabad',
  ];

  const citizens = [];
  for (let i = 0; i < citizenNames.length; i++) {
    const cit = citizenNames[i];
    const user = await prisma.user.create({
      data: {
        email: cit.email,
        passwordHash,
        name: cit.name,
        phone: `98000${String(10001 + i).padStart(5, '0')}`,
        role: 'CITIZEN',
        status: 'ACTIVE',
        emailVerified: true,
        tenantId: tenant.id,
      },
    });

    const citizen = await prisma.citizen.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        name: cit.name,
        email: cit.email,
        phone: user.phone,
        address: addresses[i % addresses.length],
        wardId: wards[i % wards.length].id,
      },
    });
    citizens.push({ user, citizen });
  }

  // ============================================
  // 7. Create Complaints
  // ============================================
  console.log('Creating complaints...');
  const complaintCategories = [
    { category: 'Garbage Collection', department: 'SWM' },
    { category: 'Street Light', department: 'LIGHT' },
    { category: 'Road Damage', department: 'ENG' },
    { category: 'Drainage Problem', department: 'WATER' },
    { category: 'Water Supply', department: 'WATER' },
    { category: 'Illegal Construction', department: 'TP' },
    { category: 'Encroachment', department: 'ENCR' },
    { category: 'Open Drain', department: 'HEALTH' },
    { category: 'Mosquito Menace', department: 'HEALTH' },
    { category: 'Stray Animals', department: 'HEALTH' },
    { category: 'Park Maintenance', department: 'PARKS' },
    { category: 'Public Toilet', department: 'HEALTH' },
  ];

  const complaintDescriptions: Record<string, string[]> = {
    'Garbage Collection': [
      'Garbage not collected for the past 3 days in our area. Foul smell is unbearable.',
      'Municipal garbage truck is not coming to our street regularly. Need immediate action.',
      'Garbage dump near our house is creating health hazard. Please clear it urgently.',
      'Dustbin overflowing near the main road. Nobody is cleaning it for a week.',
    ],
    'Street Light': [
      'Street light not working for 2 weeks near the main junction. Very dark at night.',
      'Multiple street lights not functioning in our colony. Safety concern for residents.',
      'Flickering street light causing disturbance. Needs replacement.',
      'New street lights needed in the newly developed residential area.',
    ],
    'Road Damage': [
      'Large pothole on the main road causing accidents. Very dangerous for two-wheelers.',
      'Road completely damaged after recent rains. Vehicles getting stuck.',
      'Speed breaker too high, damaging vehicle undercarriage.',
      'Road surface peeled off exposing sharp stones. Many people injured.',
    ],
    'Drainage Problem': [
      'Drainage blocked causing water logging during rains. Water entering houses.',
      'Sewage overflowing onto the road. Unhygienic conditions.',
      'Storm water drain clogged with garbage and debris.',
      'Drainage cover missing, posing danger to pedestrians.',
    ],
    'Water Supply': [
      'No water supply for past 2 days. Please restore immediately.',
      'Water coming with mud and dirt. Not fit for use.',
      'Low water pressure, barely any water reaching our floor.',
      'Water pipe leaking, water being wasted on the road.',
    ],
  };

  const statuses: Array<'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'> = [
    'CREATED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
  ];
  const priorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  const complaints = [];
  for (let i = 1; i <= 50; i++) {
    const catData = randomItem(complaintCategories);
    const dept = departments.find(d => d.code === catData.department)!;
    const citizen = randomItem(citizens);
    const ward = randomItem(wards);
    const status = randomItem(statuses);
    const priority = randomItem(priorities);

    const descriptions = complaintDescriptions[catData.category] || [
      `Issue reported regarding ${catData.category}. Needs attention.`
    ];

    const createdAt = randomDate(new Date('2024-01-01'), new Date());
    const assignedEmployee = status !== 'CREATED' ? randomItem(employees) : null;

    const complaint = await prisma.complaint.create({
      data: {
        tenantId: tenant.id,
        complaintNumber: generateComplaintNumber(i),
        citizenId: citizen.citizen.id,
        category: catData.category,
        description: randomItem(descriptions),
        address: `${addresses[i % addresses.length]}, Near ${['Bus Stop', 'Temple', 'School', 'Hospital', 'Market'][i % 5]}`,
        wardId: ward.id,
        zoneId: ward.zoneId,
        circleId: ward.circleId,
        departmentId: dept.id,
        assignedToId: assignedEmployee?.user.id,
        priority,
        status,
        createdById: citizen.user.id,
        createdAt,
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(status) 
          ? randomDate(createdAt, new Date()) 
          : null,
        closedAt: status === 'CLOSED' ? randomDate(createdAt, new Date()) : null,
      },
    });

    // Add complaint events
    await prisma.complaintEvent.create({
      data: {
        complaintId: complaint.id,
        action: 'CREATED',
        description: 'Complaint registered by citizen',
        performedById: citizen.user.id,
        createdAt,
      },
    });

    if (status !== 'CREATED' && assignedEmployee) {
      await prisma.complaintEvent.create({
        data: {
          complaintId: complaint.id,
          action: 'ASSIGNED',
          description: `Complaint assigned to ${assignedEmployee.employee.name}`,
          previousStatus: 'CREATED',
          newStatus: 'ASSIGNED',
          performedById: municipalAdmin.id,
          createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60),
        },
      });
    }

    if (['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      await prisma.complaintEvent.create({
        data: {
          complaintId: complaint.id,
          action: 'STATUS_CHANGE',
          description: 'Work started on the complaint',
          previousStatus: 'ASSIGNED',
          newStatus: 'IN_PROGRESS',
          performedById: assignedEmployee?.user.id || municipalAdmin.id,
          createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * 24),
        },
      });
    }

    if (['RESOLVED', 'CLOSED'].includes(status)) {
      await prisma.complaintEvent.create({
        data: {
          complaintId: complaint.id,
          action: 'RESOLVED',
          description: 'Issue has been resolved. Work completed successfully.',
          previousStatus: 'IN_PROGRESS',
          newStatus: 'RESOLVED',
          performedById: assignedEmployee?.user.id || municipalAdmin.id,
          createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * 48),
        },
      });
    }

    complaints.push(complaint);
  }

  // ============================================
  // 8. Create Properties
  // ============================================
  console.log('Creating properties...');
  const propertyTypes: Array<'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED_USE'> = [
    'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED_USE'
  ];

  const properties = [];
  for (let i = 0; i < 30; i++) {
    const citizen = citizens[i % citizens.length];
    const ward = wards[i % wards.length];
    const propertyType = randomItem(propertyTypes);
    const builtUpArea = randomInt(800, 5000);
    const annualTax = builtUpArea * (propertyType === 'COMMERCIAL' ? 15 : propertyType === 'INDUSTRIAL' ? 20 : 8);

    const property = await prisma.property.create({
      data: {
        tenantId: tenant.id,
        propertyId: generatePropertyId(ward.code, i + 1),
        propertyNumber: `GHMC-${ward.code}-${String(i + 1).padStart(4, '0')}`,
        ownerId: citizen.citizen.id,
        ownerName: citizen.citizen.name,
        address: `${addresses[i % addresses.length]}`,
        wardId: ward.id,
        zoneId: ward.zoneId,
        circleId: ward.circleId,
        propertyType,
        builtUpArea,
        plotArea: builtUpArea + randomInt(200, 500),
        floors: randomInt(1, 4),
        constructionYear: randomInt(1990, 2023),
        annualRentalValue: builtUpArea * randomInt(80, 150),
        annualTax,
        status: 'ACTIVE',
        lastAssessmentDate: randomDate(new Date('2023-01-01'), new Date()),
      },
    });

    // Add tax payments
    const financialYears = ['2022-23', '2023-24', '2024-25'];
    for (const fy of financialYears) {
      const isPaid = Math.random() > 0.3;
      await prisma.propertyTaxPayment.create({
        data: {
          propertyId: property.id,
          financialYear: fy,
          amount: annualTax,
          penalty: isPaid && fy !== '2024-25' ? 0 : annualTax * 0.1,
          discount: isPaid && fy === '2024-25' ? annualTax * 0.05 : 0,
          totalAmount: isPaid 
            ? annualTax - (fy === '2024-25' ? annualTax * 0.05 : 0)
            : annualTax + annualTax * 0.1,
          status: isPaid ? 'COMPLETED' : 'PENDING',
          paymentDate: isPaid ? randomDate(new Date('2024-01-01'), new Date()) : null,
          paymentMethod: isPaid ? randomItem(['ONLINE', 'UPI', 'NEFT', 'CASH']) : null,
          receiptNumber: isPaid ? `RCP-${fy.replace('-', '')}-${String(i + 1).padStart(5, '0')}` : null,
          paidById: isPaid ? citizen.user.id : null,
        },
      });
    }

    properties.push(property);
  }

  // ============================================
  // 9. Create Trade Licenses
  // ============================================
  console.log('Creating trade licenses...');
  const businessTypes = [
    { type: 'Retail Shop', category: 'Retail' },
    { type: 'Restaurant', category: 'Food & Beverage' },
    { type: 'Medical Store', category: 'Healthcare' },
    { type: 'Hardware Store', category: 'Retail' },
    { type: 'Textile Shop', category: 'Retail' },
    { type: 'Electronics Shop', category: 'Retail' },
    { type: 'Bakery', category: 'Food & Beverage' },
    { type: 'Salon', category: 'Services' },
    { type: 'Clinic', category: 'Healthcare' },
    { type: 'Printing Press', category: 'Manufacturing' },
    { type: 'Auto Workshop', category: 'Services' },
    { type: 'Gym', category: 'Services' },
  ];

  const businessNames = [
    'Sri Lakshmi Stores', 'Bismillah Restaurant', 'MedPlus Pharmacy',
    'Krishna Hardware', 'Nizam Textiles', 'Tech World Electronics',
    'Karachi Bakery', 'Style Studio Salon', 'Care Plus Clinic',
    'Quick Print Press', 'Speedy Auto Works', 'Fitness First Gym',
    'Sai Kirana Store', 'Spice Garden Restaurant', 'Apollo Pharmacy',
  ];

  const licenseStatuses: Array<'DRAFT' | 'SUBMITTED' | 'DOCUMENT_REVIEW' | 'APPROVED' | 'ISSUED' | 'EXPIRED'> = [
    'DRAFT', 'SUBMITTED', 'DOCUMENT_REVIEW', 'APPROVED', 'ISSUED', 'EXPIRED'
  ];

  for (let i = 0; i < 25; i++) {
    const citizen = citizens[i % citizens.length];
    const ward = wards[i % wards.length];
    const business = randomItem(businessTypes);
    const status = randomItem(licenseStatuses);
    const applicationDate = randomDate(new Date('2024-01-01'), new Date());
    const annualTurnover = randomInt(500000, 10000000);
    const fee = annualTurnover < 1000000 ? 2500 : annualTurnover < 5000000 ? 5000 : 10000;

    await prisma.tradeLicense.create({
      data: {
        tenantId: tenant.id,
        applicationNumber: `TLA-2024-${String(i + 1).padStart(4, '0')}`,
        applicantId: citizen.citizen.id,
        businessName: businessNames[i % businessNames.length],
        businessType: business.type,
        businessCategory: business.category,
        address: addresses[i % addresses.length],
        wardId: ward.id,
        employeeCount: randomInt(2, 20),
        annualTurnover,
        licenseNumber: ['APPROVED', 'ISSUED', 'EXPIRED'].includes(status) 
          ? generateLicenseNumber(i + 1) 
          : null,
        status,
        applicationDate,
        approvalDate: ['APPROVED', 'ISSUED', 'EXPIRED'].includes(status)
          ? new Date(applicationDate.getTime() + 1000 * 60 * 60 * 24 * 15)
          : null,
        issueDate: ['ISSUED', 'EXPIRED'].includes(status)
          ? new Date(applicationDate.getTime() + 1000 * 60 * 60 * 24 * 20)
          : null,
        expiryDate: ['ISSUED', 'EXPIRED'].includes(status)
          ? new Date(applicationDate.getTime() + 1000 * 60 * 60 * 24 * 365)
          : null,
        fee,
        paymentStatus: ['ISSUED', 'EXPIRED'].includes(status) ? 'COMPLETED' : 'PENDING',
        contactPhone: citizen.user.phone,
        contactEmail: citizen.user.email,
      },
    });
  }

  // ============================================
  // 10. Create Contractors
  // ============================================
  console.log('Creating contractors...');
  const contractorData = [
    { name: 'Hyderabad Construction Co.', specialization: ['Roads', 'Buildings'] },
    { name: 'Deccan Infrastructure Pvt Ltd', specialization: ['Bridges', 'Drainage'] },
    { name: 'Telangana Builders', specialization: ['Buildings', 'Parks'] },
    { name: 'Metro Civil Works', specialization: ['Roads', 'Storm Water'] },
    { name: 'Southern Contractors', specialization: ['Buildings', 'Renovation'] },
    { name: 'Green Earth Projects', specialization: ['Parks', 'Landscaping'] },
    { name: 'Swift Engineering Services', specialization: ['Electrical', 'Street Lighting'] },
    { name: 'Aqua Solutions', specialization: ['Water Supply', 'Drainage'] },
  ];

  const contractors = [];
  for (let i = 0; i < contractorData.length; i++) {
    const c = contractorData[i];
    const contractor = await prisma.contractor.create({
      data: {
        tenantId: tenant.id,
        name: c.name,
        registrationNumber: `GHMC-CONT-${String(1001 + i).padStart(4, '0')}`,
        email: `contact@${c.name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `98850${String(10001 + i).padStart(5, '0')}`,
        address: addresses[i % addresses.length],
        category: randomItem(['A', 'B', 'C']),
        specialization: c.specialization,
        status: 'ACTIVE',
      },
    });
    contractors.push(contractor);
  }

  // ============================================
  // 11. Create Projects
  // ============================================
  console.log('Creating projects...');
  const projectNames = [
    { name: 'Road Widening - Ameerpet to SR Nagar', dept: 'ENG', cost: 25000000 },
    { name: 'Storm Water Drain - Kukatpally', dept: 'WATER', cost: 15000000 },
    { name: 'Street Lighting - Gachibowli IT Corridor', dept: 'LIGHT', cost: 8000000 },
    { name: 'Community Park Development - Madhapur', dept: 'PARKS', cost: 5000000 },
    { name: 'Drainage Improvement - Old City', dept: 'WATER', cost: 20000000 },
    { name: 'Footpath Construction - Tank Bund', dept: 'ENG', cost: 10000000 },
    { name: 'Public Toilet Construction - 10 Locations', dept: 'HEALTH', cost: 3000000 },
    { name: 'Junction Improvement - Paradise Circle', dept: 'ENG', cost: 12000000 },
    { name: 'Lake Restoration - Hussain Sagar', dept: 'PARKS', cost: 50000000 },
    { name: 'CC Road - Secunderabad Cantonment', dept: 'ENG', cost: 18000000 },
  ];

  const projectStatuses: Array<'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED'> = [
    'PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'
  ];

  for (let i = 0; i < projectNames.length; i++) {
    const p = projectNames[i];
    const dept = departments.find(d => d.code === p.dept)!;
    const zone = randomItem(zones);
    const ward = wards.find(w => w.zoneId === zone.id)!;
    const status = randomItem(projectStatuses);
    const contractor = randomItem(contractors);

    const startDate = randomDate(new Date('2024-01-01'), new Date());
    const expectedEndDate = new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * randomInt(90, 365));

    await prisma.project.create({
      data: {
        tenantId: tenant.id,
        win: `WIN-2024-${String(i + 1).padStart(4, '0')}`,
        name: p.name,
        description: `${p.name} - Infrastructure development project under GHMC`,
        departmentId: dept.id,
        zoneId: zone.id,
        wardId: ward.id,
        contractorId: ['IN_PROGRESS', 'COMPLETED'].includes(status) ? contractor.id : null,
        estimatedCost: p.cost,
        approvedCost: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) ? p.cost * 0.95 : null,
        actualCost: status === 'COMPLETED' ? p.cost * randomInt(90, 105) / 100 : null,
        startDate: ['IN_PROGRESS', 'COMPLETED'].includes(status) ? startDate : null,
        expectedEndDate: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) ? expectedEndDate : null,
        actualEndDate: status === 'COMPLETED' ? new Date(expectedEndDate.getTime() + 1000 * 60 * 60 * 24 * randomInt(-10, 30)) : null,
        status,
        progress: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? randomInt(20, 80) : 0,
      },
    });
  }

  // ============================================
  // 12. Create Budgets
  // ============================================
  console.log('Creating budgets...');
  const financialYear = '2024-25';

  for (const dept of departments) {
    const allocated = randomInt(10000000, 100000000);
    const spent = allocated * (randomInt(30, 85) / 100);

    await prisma.budget.create({
      data: {
        tenantId: tenant.id,
        financialYear,
        departmentId: dept.id,
        allocatedAmount: allocated,
        spentAmount: spent,
        description: `Annual budget allocation for ${dept.name} department`,
      },
    });
  }

  // ============================================
  // 13. Create Transactions
  // ============================================
  console.log('Creating transactions...');
  const transactionCategories = [
    { type: 'INCOME', category: 'PROPERTY_TAX' },
    { type: 'INCOME', category: 'LICENSE_FEE' },
    { type: 'INCOME', category: 'WATER_CHARGES' },
    { type: 'EXPENSE', category: 'SALARY' },
    { type: 'EXPENSE', category: 'CONTRACTOR_PAYMENT' },
    { type: 'EXPENSE', category: 'MAINTENANCE' },
    { type: 'EXPENSE', category: 'ELECTRICITY' },
  ];

  for (let i = 0; i < 100; i++) {
    const txn = randomItem(transactionCategories);
    const amount = txn.type === 'INCOME' 
      ? randomInt(5000, 500000) 
      : randomInt(10000, 1000000);

    await prisma.transaction.create({
      data: {
        tenantId: tenant.id,
        transactionNumber: `TXN-2024-${String(i + 1).padStart(6, '0')}`,
        type: txn.type as 'INCOME' | 'EXPENSE',
        category: txn.category,
        amount,
        description: `${txn.category.replace('_', ' ')} - ${txn.type.toLowerCase()}`,
        transactionDate: randomDate(new Date('2024-01-01'), new Date()),
      },
    });
  }

  // ============================================
  // 14. Create Memberships
  // ============================================
  console.log('Creating memberships...');
  await prisma.membership.create({
    data: {
      userId: superAdmin.id,
      tenantId: tenant.id,
      role: 'SUPER_ADMIN',
      isDefault: true,
    },
  });

  await prisma.membership.create({
    data: {
      userId: municipalAdmin.id,
      tenantId: tenant.id,
      role: 'MUNICIPAL_ADMIN',
      isDefault: true,
    },
  });

  await prisma.membership.create({
    data: {
      userId: commissioner.id,
      tenantId: tenant.id,
      role: 'COMMISSIONER',
      isDefault: true,
    },
  });

  // Add memberships for all employees
  for (const emp of employees) {
    await prisma.membership.create({
      data: {
        userId: emp.user.id,
        tenantId: tenant.id,
        role: emp.user.role,
        isDefault: true,
      },
    });
  }

  // Add memberships for all citizens
  for (const cit of citizens) {
    await prisma.membership.create({
      data: {
        userId: cit.user.id,
        tenantId: tenant.id,
        role: 'CITIZEN',
        isDefault: true,
      },
    });
  }

  // ============================================
  // 15. SECOND TENANT: Mahbubnagar (small dataset)
  // ============================================
  console.log('Creating second tenant: Mahbubnagar...');

  const mbnr = await prisma.tenant.create({
    data: {
      name: 'Mahbubnagar Municipality',
      code: 'MBNR',
      description: 'Municipality of Mahbubnagar, Telangana',
      address: 'Collectorate Road, Mahbubnagar, Telangana 509001',
      contactEmail: 'commissioner@mahbubnagar.gov.in',
      contactPhone: '08542-242000',
      website: 'https://www.mahbubnagar.telangana.gov.in',
      status: 'ACTIVE',
      settings: { timezone: 'Asia/Kolkata', currency: 'INR', dateFormat: 'DD/MM/YYYY' },
    },
  });

  // Departments (small set)
  const mbnrDepartments = await Promise.all(
    [
      { name: 'Engineering', code: 'ENG', description: 'Roads and infrastructure' },
      { name: 'Health & Sanitation', code: 'HEALTH', description: 'Public health services' },
      { name: 'Solid Waste Management', code: 'SWM', description: 'Garbage collection' },
    ].map((dept) => prisma.department.create({ data: { ...dept, tenantId: mbnr.id } }))
  );

  // One zone, one circle, two wards
  const mbnrZone = await prisma.zone.create({
    data: { tenantId: mbnr.id, name: 'Central Zone', code: 'CEN' },
  });
  const mbnrCircle = await prisma.circle.create({
    data: { tenantId: mbnr.id, zoneId: mbnrZone.id, name: 'Central Circle 1', code: 'CEN-C1' },
  });
  const mbnrWards = [];
  for (let w = 1; w <= 2; w++) {
    const ward = await prisma.ward.create({
      data: {
        tenantId: mbnr.id,
        zoneId: mbnrZone.id,
        circleId: mbnrCircle.id,
        name: `Ward ${w}`,
        code: `MW${String(w).padStart(3, '0')}`,
        population: randomInt(8000, 20000),
        area: randomInt(2, 5),
      },
    });
    mbnrWards.push(ward);
  }

  // Municipal admin for Mahbubnagar
  const mbnrAdmin = await prisma.user.create({
    data: {
      email: 'admin@mahbubnagar.gov.in',
      passwordHash,
      name: 'Anand Kumar',
      phone: '9911000001',
      role: 'MUNICIPAL_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: mbnr.id,
    },
  });
  await prisma.membership.create({
    data: { userId: mbnrAdmin.id, tenantId: mbnr.id, role: 'MUNICIPAL_ADMIN', isDefault: true },
  });

  // Two citizens
  const mbnrCitizens = [];
  const mbnrCitizenData = [
    { name: 'Ravi Teja', email: 'ravi.teja@gmail.com' },
    { name: 'Sneha Reddy', email: 'sneha.reddy@gmail.com' },
  ];
  for (let i = 0; i < mbnrCitizenData.length; i++) {
    const c = mbnrCitizenData[i];
    const user = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash,
        name: c.name,
        phone: `97000${String(20001 + i).padStart(5, '0')}`,
        role: 'CITIZEN',
        status: 'ACTIVE',
        emailVerified: true,
        tenantId: mbnr.id,
      },
    });
    const citizen = await prisma.citizen.create({
      data: {
        tenantId: mbnr.id,
        userId: user.id,
        name: c.name,
        email: c.email,
        phone: user.phone,
        address: `${10 + i}-2-${100 + i}, Bhoot Bungalow Road, Mahbubnagar`,
        wardId: mbnrWards[i % mbnrWards.length].id,
      },
    });
    await prisma.membership.create({
      data: { userId: user.id, tenantId: mbnr.id, role: 'CITIZEN', isDefault: true },
    });
    mbnrCitizens.push({ user, citizen });
  }

  // A few complaints
  const mbnrComplaintData = [
    { category: 'Garbage Collection', deptCode: 'SWM', status: 'CREATED' as const, priority: 'MEDIUM' as const, desc: 'Garbage not collected near the bus stand for 4 days.' },
    { category: 'Road Damage', deptCode: 'ENG', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, desc: 'Large pothole on the main road near the market causing accidents.' },
    { category: 'Water Supply', deptCode: 'HEALTH', status: 'RESOLVED' as const, priority: 'URGENT' as const, desc: 'No water supply in our ward for two days.' },
  ];
  for (let i = 0; i < mbnrComplaintData.length; i++) {
    const cd = mbnrComplaintData[i];
    const dept = mbnrDepartments.find((d) => d.code === cd.deptCode)!;
    const citizen = mbnrCitizens[i % mbnrCitizens.length];
    const ward = mbnrWards[i % mbnrWards.length];
    const createdAt = randomDate(new Date('2025-01-01'), new Date());
    const complaint = await prisma.complaint.create({
      data: {
        tenantId: mbnr.id,
        complaintNumber: `GRV-2026-M${String(i + 1).padStart(4, '0')}`,
        citizenId: citizen.citizen.id,
        category: cd.category,
        description: cd.desc,
        address: `Ward ${i + 1}, Mahbubnagar`,
        wardId: ward.id,
        zoneId: mbnrZone.id,
        circleId: mbnrCircle.id,
        departmentId: dept.id,
        priority: cd.priority,
        status: cd.status,
        createdById: citizen.user.id,
        createdAt,
        resolvedAt: cd.status === 'RESOLVED' ? randomDate(createdAt, new Date()) : null,
      },
    });
    await prisma.complaintEvent.create({
      data: {
        complaintId: complaint.id,
        action: 'CREATED',
        description: 'Complaint registered by citizen',
        performedById: citizen.user.id,
        createdAt,
      },
    });
  }

  // Two trade licenses (one SUBMITTED so admin can approve)
  const mbnrLicenseData = [
    { businessName: 'Balaji Kirana Store', businessType: 'Retail Shop', category: 'Retail', status: 'SUBMITTED' as const },
    { businessName: 'Sri Venkateswara Bakery', businessType: 'Bakery', category: 'Food & Beverage', status: 'ISSUED' as const },
  ];
  for (let i = 0; i < mbnrLicenseData.length; i++) {
    const ld = mbnrLicenseData[i];
    const citizen = mbnrCitizens[i % mbnrCitizens.length];
    const ward = mbnrWards[i % mbnrWards.length];
    const applicationDate = randomDate(new Date('2025-06-01'), new Date());
    const issued = ld.status === 'ISSUED';
    await prisma.tradeLicense.create({
      data: {
        tenantId: mbnr.id,
        applicationNumber: `TLA-2026-M${String(i + 1).padStart(3, '0')}`,
        applicantId: citizen.citizen.id,
        businessName: ld.businessName,
        businessType: ld.businessType,
        businessCategory: ld.category,
        address: `Ward ${i + 1}, Mahbubnagar`,
        wardId: ward.id,
        employeeCount: randomInt(2, 8),
        annualTurnover: randomInt(300000, 2000000),
        licenseNumber: issued ? `LIC-2026-MBNR${i + 1}` : null,
        status: ld.status,
        applicationDate,
        approvalDate: issued ? new Date(applicationDate.getTime() + 1000 * 60 * 60 * 24 * 10) : null,
        issueDate: issued ? new Date(applicationDate.getTime() + 1000 * 60 * 60 * 24 * 12) : null,
        expiryDate: issued ? new Date(applicationDate.getTime() + 1000 * 60 * 60 * 24 * 365) : null,
        fee: issued ? 2500 : null,
        paymentStatus: issued ? 'COMPLETED' : 'PENDING',
        contactPhone: citizen.user.phone,
        contactEmail: citizen.user.email,
      },
    });
  }

  // Give the Super Admin access to BOTH tenants (membership in Mahbubnagar)
  await prisma.membership.create({
    data: { userId: superAdmin.id, tenantId: mbnr.id, role: 'SUPER_ADMIN', isDefault: false },
  });

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log('\nTest Accounts (Password: Password@123):');
  console.log('----------------------------------------');
  console.log('Super Admin:      superadmin@ghmc.gov.in');
  console.log('Municipal Admin:  admin@ghmc.gov.in');
  console.log('Commissioner:     commissioner@ghmc.gov.in');
  console.log('Employee:         suresh.reddy@ghmc.gov.in');
  console.log('Citizen:          sanjay.patel@gmail.com');
  console.log('----------------------------------------');
  console.log('\nMahbubnagar (2nd tenant) accounts:');
  console.log('  Municipal Admin:  admin@mahbubnagar.gov.in');
  console.log('  Citizen:          ravi.teja@gmail.com');
  console.log('  (Super Admin can access BOTH tenants via the switcher)');
  console.log('----------------------------------------');
  console.log('\nData Summary:');
  console.log(`- 2 Tenants (GHMC + Mahbubnagar)`);
  console.log(`- ${departments.length} Departments`);
  console.log(`- ${zones.length} Zones, ${circles.length} Circles, ${wards.length} Wards`);
  console.log(`- ${employees.length + 3} Users (3 admins + ${employees.length} employees + ${citizens.length} citizens)`);
  console.log(`- ${complaints.length} Complaints`);
  console.log(`- ${properties.length} Properties`);
  console.log(`- 25 Trade Licenses`);
  console.log(`- ${contractors.length} Contractors`);
  console.log(`- 10 Projects`);
  console.log(`- 100 Transactions`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
