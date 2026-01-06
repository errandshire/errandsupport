require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID
};

/**
 * Find all duplicate user accounts in the system
 * Checks for duplicates by:
 * 1. Same phone number
 * 2. Same email
 * 3. Same name
 */
async function findAllDuplicates() {
  console.log('🔍 Scanning for duplicate user accounts...\n');

  // Fetch all users
  let allUsers = [];
  let offset = 0;
  const limit = 100;

  console.log('📥 Fetching all users...');
  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.limit(limit), Query.offset(offset)]
    );

    allUsers = allUsers.concat(response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`✅ Found ${allUsers.length} total users\n`);

  // Find duplicates by phone
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('              DUPLICATES BY PHONE NUMBER                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const phoneMap = {};
  allUsers.forEach(user => {
    const phone = user.phone || user.phoneNumber;
    if (phone) {
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(user);
    }
  });

  const phoneDuplicates = Object.entries(phoneMap).filter(([phone, users]) => users.length > 1);

  if (phoneDuplicates.length > 0) {
    console.log(`⚠️  Found ${phoneDuplicates.length} phone number(s) with duplicates:\n`);

    for (const [phone, users] of phoneDuplicates) {
      console.log(`📱 Phone: ${phone} (${users.length} accounts)`);

      // Check which has WORKERS profile
      const usersWithWorkers = [];
      for (const user of users) {
        const workerProfiles = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', user.$id), Query.limit(1)]
        );
        const hasWorker = workerProfiles.documents.length > 0;
        usersWithWorkers.push({ user, hasWorker });
      }

      usersWithWorkers.forEach(({ user, hasWorker }, index) => {
        console.log(`   ${index + 1}. ${user.$id}`);
        console.log(`      Email: ${user.email || 'N/A'}`);
        console.log(`      Name: ${user.name || 'N/A'}`);
        console.log(`      Created: ${new Date(user.$createdAt).toLocaleString()}`);
        console.log(`      Has WORKERS: ${hasWorker ? '✅ YES' : '❌ NO'}`);
        console.log(`      ${hasWorker ? '👉 KEEP THIS ONE' : '🗑️  Can delete'}`);
        console.log('');
      });
    }
  } else {
    console.log('✅ No duplicate phone numbers found!\n');
  }

  // Find duplicates by email
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                 DUPLICATES BY EMAIL                           ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const emailMap = {};
  allUsers.forEach(user => {
    const email = user.email;
    if (email) {
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(user);
    }
  });

  const emailDuplicates = Object.entries(emailMap).filter(([email, users]) => users.length > 1);

  if (emailDuplicates.length > 0) {
    console.log(`⚠️  Found ${emailDuplicates.length} email(s) with duplicates:\n`);

    for (const [email, users] of emailDuplicates) {
      console.log(`📧 Email: ${email} (${users.length} accounts)`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.$id} - Created: ${new Date(user.$createdAt).toLocaleString()}`);
      });
      console.log('');
    }
  } else {
    console.log('✅ No duplicate emails found!\n');
  }

  // Find duplicates by exact name match
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                  DUPLICATES BY NAME                           ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const nameMap = {};
  allUsers.forEach(user => {
    const name = user.name;
    if (name && name.trim().length > 3) { // Only names with more than 3 chars
      const normalizedName = name.trim().toLowerCase();
      if (!nameMap[normalizedName]) nameMap[normalizedName] = [];
      nameMap[normalizedName].push(user);
    }
  });

  const nameDuplicates = Object.entries(nameMap).filter(([name, users]) => users.length > 1);

  if (nameDuplicates.length > 0) {
    console.log(`⚠️  Found ${nameDuplicates.length} name(s) with duplicates:\n`);

    for (const [name, users] of nameDuplicates) {
      if (users.length <= 5) { // Only show if not too many (common names)
        console.log(`👤 Name: ${name} (${users.length} accounts)`);
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.$id} - ${user.email || 'No email'} - Created: ${new Date(user.$createdAt).toLocaleString()}`);
        });
        console.log('');
      }
    }
  } else {
    console.log('✅ No duplicate names found!\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                        SUMMARY                                ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📊 Duplicate Statistics:`);
  console.log(`   Phone duplicates:  ${phoneDuplicates.length}`);
  console.log(`   Email duplicates:  ${emailDuplicates.length}`);
  console.log(`   Name duplicates:   ${nameDuplicates.length}\n`);

  if (phoneDuplicates.length > 0 || emailDuplicates.length > 0) {
    console.log('⚠️  RECOMMENDATION: Review duplicates above and delete accounts without WORKERS profiles.\n');
  } else {
    console.log('✅ Database is clean! No significant duplicates found.\n');
  }
}

async function main() {
  try {
    await findAllDuplicates();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main();
