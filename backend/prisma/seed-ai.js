/**
 * Database seed for AI features testing
 * Run with: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users if they don't exist
  const testUsers = await prisma.user.upsert({
    where: { email: 'test1@example.com' },
    update: {},
    create: {
      email: 'test1@example.com',
      password: 'hashed_password_here',
      firstName: 'John',
      lastName: 'Doe',
      gender: 'Male',
      age: 28,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      maritalStatus: 'Never Married',
      education: 'Graduate',
      profession: 'Software Engineer',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true
    }
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'test2@example.com' },
    update: {},
    create: {
      email: 'test2@example.com',
      password: 'hashed_password_here',
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'Female',
      age: 26,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      maritalStatus: 'Never Married',
      education: 'Post Graduate',
      profession: 'Doctor',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true
    }
  });

  console.log('✅ Test users created');

  // Create AI profiles
  await prisma.profile.upsert({
    where: { userId: testUsers.id },
    update: {},
    create: {
      userId: testUsers.id,
      gender: 'Male',
      dob: new Date(1995, 5, 15),
      age: 28,
      religion: 'Hindu',
      caste: 'Boyar',
      motherTongue: 'Hindi',
      maritalStatus: 'Never Married',
      education: 'Graduate',
      occupation: 'Software Engineer',
      income: '8-10 LPA',
      location: 'Mumbai, Maharashtra',
      aboutMe: 'I am a software engineer with a passion for technology and innovation. I come from a traditional family and value cultural heritage. Looking for a life partner who shares similar values and aspirations.',
      partnerPreferences: JSON.stringify({
        ageRange: '24-30',
        education: 'Graduate or above',
        occupation: 'Professional',
        location: 'Mumbai or willing to relocate'
      }),
      photoUrls: [],
      isVerified: true
    }
  });

  await prisma.profile.upsert({
    where: { userId: testUser2.id },
    update: {},
    create: {
      userId: testUser2.id,
      gender: 'Female',
      dob: new Date(1997, 2, 20),
      age: 26,
      religion: 'Hindu',
      caste: 'Boyar',
      motherTongue: 'Hindi',
      maritalStatus: 'Never Married',
      education: 'Post Graduate',
      occupation: 'Doctor',
      income: '12-15 LPA',
      location: 'Mumbai, Maharashtra',
      aboutMe: 'I am a doctor dedicated to serving others. Family oriented and deeply rooted in our cultural values. Seeking a compatible life partner who understands the balance between career and family life.',
      partnerPreferences: JSON.stringify({
        ageRange: '26-32',
        education: 'Graduate or above',
        occupation: 'Professional',
        location: 'Mumbai or nearby'
      }),
      photoUrls: [],
      isVerified: true
    }
  });

  console.log('✅ AI profiles created');

  // Create a test interest
  await prisma.interest.create({
    data: {
      senderId: testUsers.id,
      receiverId: testUser2.id,
      status: 'PENDING',
      message: 'Hi, I found your profile interesting and would like to connect.'
    }
  });

  console.log('✅ Test interest created');

  // Create test subscription
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 90);

  await prisma.subscription.create({
    data: {
      userId: testUsers.id,
      plan: 'PREMIUM',
      amount: 999,
      startDate: now,
      endDate: endDate,
      status: 'ACTIVE'
    }
  });

  console.log('✅ Test subscription created');

  console.log('\n🌱 Database seeded successfully!');
  console.log('\nTest Users:');
  console.log(`User 1: ${testUsers.email} (ID: ${testUsers.id})`);
  console.log(`User 2: ${testUser2.email} (ID: ${testUser2.id})`);
  console.log('\nYou can now test the AI features using these accounts.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });