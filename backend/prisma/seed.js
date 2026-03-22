const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@2061979', 12);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'vijayalakshmijayakumar45@gmail.com' },
    update: {
      password: hashedPassword,
      name: 'Vijayalakshmi Admin',
      role: 'SUPER_ADMIN'
    },
    create: {
      email: 'vijayalakshmijayakumar45@gmail.com',
      password: hashedPassword,
      name: 'Vijayalakshmi Admin',
      role: 'SUPER_ADMIN'
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample users for testing
  const sampleUsers = [
    {
      email: 'rama.krishna@example.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Rama',
      lastName: 'Krishna',
      gender: 'MALE',
      dateOfBirth: new Date('1992-05-15'),
      age: 32,
      community: 'Boyar',
      subCaste: 'Kapu',
      city: 'Bangalore',
      state: 'Karnataka',
      education: 'B.Tech Computer Science',
      profession: 'Software Engineer',
      income: '8-10 Lakhs',
      maritalStatus: 'SINGLE',
      height: '175',
      weight: '72',
      complexion: 'Fair',
      bio: 'Looking for a life partner from Boyar community',
      familyValues: 'Traditional',
      aboutFamily: 'Middle class family with strong values',
      isVerified: true
    },
    {
      email: 'sowmya.reddy@example.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Sowmya',
      lastName: 'Reddy',
      gender: 'FEMALE',
      dateOfBirth: new Date('1995-08-22'),
      age: 29,
      community: 'Boyar',
      subCaste: 'Reddy',
      city: 'Hyderabad',
      state: 'Telangana',
      education: 'M.Sc Mathematics',
      profession: 'Teacher',
      income: '4-6 Lakhs',
      maritalStatus: 'SINGLE',
      height: '162',
      weight: '55',
      complexion: 'Wheatish',
      bio: 'Seeking a compatible partner from our community',
      familyValues: 'Moderate',
      aboutFamily: 'Respectable family with traditional values',
      isVerified: true
    },
    {
      email: 'sowmya.reddy@example.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Sowmya',
      lastName: 'Reddy',
      gender: 'FEMALE',
      dateOfBirth: new Date('1995-08-22'),
      age: 29,
      community: 'Boyar',
      subCaste: 'Reddy',
      city: 'Hyderabad',
      state: 'Telangana',
      education: 'M.Sc Mathematics',
      profession: 'Teacher',
      income: '4-6 Lakhs',
      maritalStatus: 'SINGLE',
      height: '162',
      weight: '55',
      complexion: 'Wheatish',
      bio: 'Seeking a compatible partner from our community',
      familyValues: 'Moderate',
      aboutFamily: 'Respectable family with traditional values',
      isVerified: true
    }
  ];

    for (const userData of sampleUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData
    });
    console.log(`✅ Sample user created: ${user.firstName} ${user.lastName}`);
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });