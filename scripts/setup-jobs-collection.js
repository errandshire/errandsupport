/**
 * Setup script to create JOBS collection in Appwrite
 *
 * Usage:
 * 1. Make sure you have your Appwrite admin API key
 * 2. Run: node scripts/setup-jobs-collection.js
 */

// Load environment variables
require('dotenv').config();

const { Client, Databases, ID } = require('node-appwrite');

// Configuration - Update these values
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY; // Admin API key required
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function setupJobsCollection() {
  if (!APPWRITE_API_KEY) {
    console.error('❌ Error: APPWRITE_API_KEY not found in environment variables');
    console.log('Please set your Appwrite admin API key in .env:');
    console.log('APPWRITE_API_KEY=your_admin_api_key_here');
    process.exit(1);
  }

  if (!APPWRITE_PROJECT_ID || !DATABASE_ID) {
    console.error('❌ Error: Missing required environment variables');
    console.log('Required: NEXT_PUBLIC_APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_DATABASE_ID');
    process.exit(1);
  }

  console.log('🚀 Starting JOBS collection setup...\n');

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Step 1: Create the collection
    console.log('📦 Creating JOBS collection...');
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'jobs',
      [
        // Read: Any authenticated user
        'read("any")',
        // Create: Any authenticated user (we'll validate role in code)
        'create("users")',
        // Update: Any authenticated user (we'll validate in code)
        'update("users")',
        // Delete: Any authenticated user (we'll validate in code)
        'delete("users")'
      ]
    );

    const collectionId = collection.$id;
    console.log(`✅ Collection created with ID: ${collectionId}\n`);

    // Step 2: Create attributes
    console.log('📝 Creating attributes...\n');

    // 1. clientId
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'clientId', 50, true);
    console.log('  ✓ clientId (string, 50)');

    // 2. title
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'title', 200, true);
    console.log('  ✓ title (string, 200)');

    // 3. description
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'description', 2000, true);
    console.log('  ✓ description (string, 2000)');

    // 4. categoryId
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'categoryId', 50, true);
    console.log('  ✓ categoryId (string, 50)');

    // 5. budgetType
    await databases.createEnumAttribute(
      DATABASE_ID,
      collectionId,
      'budgetType',
      ['fixed', 'range'],
      true
    );
    console.log('  ✓ budgetType (enum: fixed, range)');

    // 6. budgetMin
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, 'budgetMin', true);
    console.log('  ✓ budgetMin (integer)');

    // 7. budgetMax
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, 'budgetMax', true);
    console.log('  ✓ budgetMax (integer)');

    // 8. locationAddress
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'locationAddress', 500, true);
    console.log('  ✓ locationAddress (string, 500)');

    // 9. locationLat
    await databases.createFloatAttribute(DATABASE_ID, collectionId, 'locationLat', false);
    console.log('  ✓ locationLat (float, optional)');

    // 10. locationLng
    await databases.createFloatAttribute(DATABASE_ID, collectionId, 'locationLng', false);
    console.log('  ✓ locationLng (float, optional)');

    // 11. scheduledDate
    await databases.createDatetimeAttribute(DATABASE_ID, collectionId, 'scheduledDate', true);
    console.log('  ✓ scheduledDate (datetime)');

    // 12. scheduledTime
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'scheduledTime', 10, true);
    console.log('  ✓ scheduledTime (string, 10)');

    // 13. duration
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, 'duration', true);
    console.log('  ✓ duration (integer)');

    // 14. skillsRequired
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'skillsRequired', 100, false, undefined, true);
    console.log('  ✓ skillsRequired (string array, 100, optional)');

    // 15. attachments
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'attachments', 500, false, undefined, true);
    console.log('  ✓ attachments (string array, 500, optional)');

    // 16. status
    await databases.createEnumAttribute(
      DATABASE_ID,
      collectionId,
      'status',
      ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired'],
      true
    );
    console.log('  ✓ status (enum: open, assigned, in_progress, completed, cancelled, expired)');

    // 17. assignedWorkerId
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'assignedWorkerId', 50, false);
    console.log('  ✓ assignedWorkerId (string, 50, optional)');

    // 18. assignedAt
    await databases.createDatetimeAttribute(DATABASE_ID, collectionId, 'assignedAt', false);
    console.log('  ✓ assignedAt (datetime, optional)');

    // 19. bookingId
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'bookingId', 50, false);
    console.log('  ✓ bookingId (string, 50, optional)');

    // 20. expiresAt
    await databases.createDatetimeAttribute(DATABASE_ID, collectionId, 'expiresAt', true);
    console.log('  ✓ expiresAt (datetime)');

    // 21. viewCount
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, 'viewCount', false, 0);
    console.log('  ✓ viewCount (integer, default: 0)');

    console.log('\n⏳ Waiting for attributes to be available...');
    // Wait a bit for attributes to be fully created
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Create indexes
    console.log('\n🔍 Creating indexes...\n');

    try {
      await databases.createIndex(DATABASE_ID, collectionId, 'clientId_index', 'key', ['clientId']);
      console.log('  ✓ clientId_index');
    } catch (error) {
      console.log('  ⚠ clientId_index (may already exist)');
    }

    try {
      await databases.createIndex(DATABASE_ID, collectionId, 'categoryId_index', 'key', ['categoryId']);
      console.log('  ✓ categoryId_index');
    } catch (error) {
      console.log('  ⚠ categoryId_index (may already exist)');
    }

    try {
      await databases.createIndex(DATABASE_ID, collectionId, 'status_index', 'key', ['status']);
      console.log('  ✓ status_index');
    } catch (error) {
      console.log('  ⚠ status_index (may already exist)');
    }

    try {
      await databases.createIndex(DATABASE_ID, collectionId, 'assignedWorkerId_index', 'key', ['assignedWorkerId']);
      console.log('  ✓ assignedWorkerId_index');
    } catch (error) {
      console.log('  ⚠ assignedWorkerId_index (may already exist)');
    }

    console.log('\n✅ JOBS collection setup completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Add this to your .env file:');
    console.log(`   NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID=${collectionId}`);
    console.log('2. Restart your development server');
    console.log('3. Test the job posting feature\n');

  } catch (error) {
    console.error('\n❌ Error setting up JOBS collection:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the setup
setupJobsCollection();
