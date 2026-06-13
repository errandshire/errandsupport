/**
 * User Lookup Script
 * 
 * This script helps you look up users and workers in your Appwrite database
 * 
 * Usage:
 * 1. Look up by email:
 *    node scripts/lookup-user.js email user@example.com
 * 
 * 2. Look up by user ID:
 *    node scripts/lookup-user.js id 123456789
 * 
 * 3. List all workers:
 *    node scripts/lookup-user.js list workers
 * 
 * 4. List all users:
 *    node scripts/lookup-user.js list all
 */

const https = require('https');

// Your Appwrite configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;
const WORKERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY; // Server API key needed

if (!APPWRITE_PROJECT_ID || !APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !WORKERS_COLLECTION_ID) {
  console.error('❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

function makeRequest(path, queries = []) {
  return new Promise((resolve, reject) => {
    const queryString = queries.length > 0 ? '?' + queries.join('&') : '';
    const url = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${path}${queryString}`;
    
    const options = {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'Content-Type': 'application/json'
      }
    };

    if (APPWRITE_API_KEY) {
      options.headers['X-Appwrite-Key'] = APPWRITE_API_KEY;
    }

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function lookupByEmail(email) {
  console.log(`\n🔍 Looking up user by email: ${email}\n`);
  
  try {
    const result = await makeRequest(
      `${USERS_COLLECTION_ID}/documents`,
      [`queries[]=equal("email", "${email}")`]
    );

    if (result.documents && result.documents.length > 0) {
      const user = result.documents[0];
      console.log('✅ USER FOUND:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID:           ${user.$id}`);
      console.log(`Name:         ${user.name}`);
      console.log(`Email:        ${user.email}`);
      console.log(`Role:         ${user.role}`);
      console.log(`Phone:        ${user.phone || 'N/A'}`);
      console.log(`Active:       ${user.isActive}`);
      console.log(`Verified:     ${user.isVerified}`);
      console.log(`Onboarded:    ${user.isOnboarded || false}`);
      console.log(`Created:      ${user.$createdAt}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // If worker, check for worker document
      if (user.role === 'worker') {
        console.log('🔍 Checking for worker document...\n');
        
        const workerResult = await makeRequest(
          `${WORKERS_COLLECTION_ID}/documents`,
          [`queries[]=equal("userId", "${user.$id}")`]
        );

        if (workerResult.documents && workerResult.documents.length > 0) {
          const worker = workerResult.documents[0];
          console.log('✅ WORKER DOCUMENT FOUND:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Worker ID:    ${worker.$id}`);
          console.log(`Categories:   ${worker.categories?.join(', ') || 'None'}`);
          console.log(`Hourly Rate:  ₦${worker.hourlyRate || 0}`);
          console.log(`Verified:     ${worker.isVerified}`);
          console.log(`Status:       ${worker.verificationStatus || 'N/A'}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('✅ This worker CAN apply for jobs!\n');
        } else {
          console.log('❌ WORKER DOCUMENT NOT FOUND!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠️  This is why the worker cannot apply for jobs!');
          console.log('💡 Solution: Run the migration script to create the worker document');
          console.log('   POST /api/migrate/workers\n');
        }
      }
    } else {
      console.log('❌ NO USER FOUND with that email\n');
      console.log('Possible reasons:');
      console.log('1. User never registered');
      console.log('2. Email is incorrect');
      console.log('3. Database was restored to an earlier backup\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function lookupById(userId) {
  console.log(`\n🔍 Looking up user by ID: ${userId}\n`);
  
  try {
    const result = await makeRequest(`${USERS_COLLECTION_ID}/documents/${userId}`);

    if (result.$id) {
      console.log('✅ USER FOUND:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID:           ${result.$id}`);
      console.log(`Name:         ${result.name}`);
      console.log(`Email:        ${result.email}`);
      console.log(`Role:         ${result.role}`);
      console.log(`Phone:        ${result.phone || 'N/A'}`);
      console.log(`Active:       ${result.isActive}`);
      console.log(`Verified:     ${result.isVerified}`);
      console.log(`Onboarded:    ${result.isOnboarded || false}`);
      console.log(`Created:      ${result.$createdAt}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // If worker, check for worker document
      if (result.role === 'worker') {
        console.log('🔍 Checking for worker document...\n');
        
        const workerResult = await makeRequest(
          `${WORKERS_COLLECTION_ID}/documents`,
          [`queries[]=equal("userId", "${result.$id}")`]
        );

        if (workerResult.documents && workerResult.documents.length > 0) {
          const worker = workerResult.documents[0];
          console.log('✅ WORKER DOCUMENT FOUND:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Worker ID:    ${worker.$id}`);
          console.log(`Categories:   ${worker.categories?.join(', ') || 'None'}`);
          console.log(`Hourly Rate:  ₦${worker.hourlyRate || 0}`);
          console.log(`Verified:     ${worker.isVerified}`);
          console.log(`Status:       ${worker.verificationStatus || 'N/A'}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('✅ This worker CAN apply for jobs!\n');
        } else {
          console.log('❌ WORKER DOCUMENT NOT FOUND!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠️  This is why the worker cannot apply for jobs!');
          console.log('💡 Solution: Run the migration script to create the worker document');
          console.log('   POST /api/migrate/workers\n');
        }
      }
    }
  } catch (error) {
    console.log('❌ NO USER FOUND with that ID\n');
    console.error('Error:', error.message);
  }
}

async function listUsers(role = null) {
  console.log(`\n📋 Listing ${role || 'all'} users...\n`);
  
  try {
    const queries = ['queries[]=limit(25)', 'queries[]=orderDesc("$createdAt")'];
    if (role) {
      queries.push(`queries[]=equal("role", "${role}")`);
    }

    const result = await makeRequest(`${USERS_COLLECTION_ID}/documents`, queries);

    if (result.documents && result.documents.length > 0) {
      console.log(`Found ${result.total} total users (showing first ${result.documents.length}):\n`);
      
      for (const user of result.documents) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`${user.name} (${user.email})`);
        console.log(`ID: ${user.$id} | Role: ${user.role} | Created: ${user.$createdAt}`);
        
        if (user.role === 'worker') {
          const workerResult = await makeRequest(
            `${WORKERS_COLLECTION_ID}/documents`,
            [`queries[]=equal("userId", "${user.$id}")`]
          );
          const hasWorker = workerResult.documents && workerResult.documents.length > 0;
          console.log(`Worker Doc: ${hasWorker ? '✅ YES' : '❌ MISSING'}`);
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('❌ No users found\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const value = args[1];

if (!command) {
  console.log(`
User Lookup Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage:
  node scripts/lookup-user.js email <email>
  node scripts/lookup-user.js id <userId>
  node scripts/lookup-user.js list [workers|all]

Examples:
  node scripts/lookup-user.js email john@example.com
  node scripts/lookup-user.js id 123456789
  node scripts/lookup-user.js list workers
  `);
  process.exit(0);
}

switch (command) {
  case 'email':
    if (!value) {
      console.error('❌ Please provide an email address');
      process.exit(1);
    }
    lookupByEmail(value);
    break;
  
  case 'id':
    if (!value) {
      console.error('❌ Please provide a user ID');
      process.exit(1);
    }
    lookupById(value);
    break;
  
  case 'list':
    listUsers(value === 'workers' ? 'worker' : null);
    break;
  
  default:
    console.error('❌ Unknown command. Use: email, id, or list');
    process.exit(1);
}
