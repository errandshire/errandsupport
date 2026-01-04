require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkSpecificWorker() {
  console.log('🔍 Checking worker profile with userId: 694db448001f481c1f9d\n');

  // Find worker with that userId
  const workerResponse = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
    [Query.equal('userId', '694db448001f481c1f9d')]
  );

  if (workerResponse.documents.length === 0) {
    console.log('❌ No worker found with userId: 694db448001f481c1f9d\n');
  } else {
    const worker = workerResponse.documents[0];
    console.log('✅ Worker found:');
    console.log(`   Document ID:  ${worker.$id}`);
    console.log(`   userId:       ${worker.userId}`);
    console.log(`   Name:         ${worker.firstName} ${worker.lastName}`);
    console.log(`   Email:        ${worker.email}`);
    console.log(`   Phone:        ${worker.phoneNumber}`);
    console.log(`   Has ID Doc:   ${worker.idDocument ? 'YES' : 'NO'}`);
    console.log(`   Has Selfie:   ${worker.selfieWithId ? 'YES' : 'NO'}`);
    console.log('');

    // Try to find corresponding user
    console.log('🔍 Looking for user with ID: 694db448001f481c1f9d\n');
    try {
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        '694db448001f481c1f9d'
      );
      console.log('✅ User found:');
      console.log(`   User ID:      ${user.$id}`);
      console.log(`   Name:         ${user.firstName} ${user.lastName}`);
      console.log(`   Email:        ${user.email}`);
      console.log(`   Role:         ${user.role}`);
      console.log('');
    } catch (error) {
      console.log('❌ No user found with ID: 694db448001f481c1f9d');
      console.log(`   Error: ${error.message}\n`);
    }
  }

  console.log('\n🔍 Checking user: 69515c050027ac8246f7 (twinsluv0007@gmail.com)\n');

  // Check the user from admin page
  try {
    const user = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      '69515c050027ac8246f7'
    );
    console.log('✅ User found:');
    console.log(`   User ID:      ${user.$id}`);
    console.log(`   Name:         ${user.firstName} ${user.lastName}`);
    console.log(`   Email:        ${user.email}`);
    console.log(`   Role:         ${user.role}`);
    console.log('');

    // Try to find worker profile
    const workerResponse2 = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
      [Query.equal('userId', '69515c050027ac8246f7')]
    );

    if (workerResponse2.documents.length === 0) {
      console.log('❌ No worker profile found for this user\n');

      // Search by name/email
      console.log('🔍 Searching for worker by email...\n');
      const workerByEmail = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
        [Query.equal('email', user.email)]
      );

      if (workerByEmail.documents.length > 0) {
        console.log(`✅ Found ${workerByEmail.documents.length} worker(s) with matching email:\n`);
        workerByEmail.documents.forEach((w, index) => {
          console.log(`   Worker ${index + 1}:`);
          console.log(`   Document ID:  ${w.$id}`);
          console.log(`   userId:       ${w.userId}`);
          console.log(`   Name:         ${w.firstName} ${w.lastName}`);
          console.log(`   Email:        ${w.email}`);
          console.log(`   Has Docs:     ${w.idDocument ? 'YES' : 'NO'}`);
          console.log('');
        });
      } else {
        console.log('❌ No worker found with matching email either\n');
      }
    } else {
      console.log('✅ Worker profile found for this user\n');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

checkSpecificWorker();
