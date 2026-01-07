const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const JOB_APPLICATIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;
const JOBS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID;

async function setupPermissions() {
  console.log('🔐 Setting up permissions for job applications workflow...\n');

  try {
    // 1. Update JOB_APPLICATIONS collection permissions
    console.log('📝 Setting JOB_APPLICATIONS collection permissions...');
    await databases.updateCollection(
      DATABASE_ID,
      JOB_APPLICATIONS_COLLECTION_ID,
      'JOB_APPLICATIONS',
      [
        // Any authenticated user can create applications
        Permission.create(Role.users()),
        // Any authenticated user can read applications
        Permission.read(Role.users()),
        // Users can update their own applications (for withdrawing)
        Permission.update(Role.users()),
        // Users can delete their own applications (for withdrawing)
        Permission.delete(Role.users()),
      ],
      true, // Document security enabled
      true  // Enabled
    );
    console.log('✅ JOB_APPLICATIONS permissions updated!\n');

    // 2. Update JOBS collection permissions
    console.log('📝 Setting JOBS collection permissions...');

    // Note: We need to preserve existing permissions for clients while adding worker permissions
    await databases.updateCollection(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      'JOBS',
      [
        // Any authenticated user can read jobs
        Permission.read(Role.users()),
        // Any authenticated user can create jobs (clients posting jobs)
        Permission.create(Role.users()),
        // Any authenticated user can update jobs (for applicant count, and clients editing)
        Permission.update(Role.users()),
        // Users can delete their own jobs
        Permission.delete(Role.users()),
      ],
      true, // Document security enabled
      true  // Enabled
    );
    console.log('✅ JOBS permissions updated!\n');

    console.log('✨ All permissions set successfully!\n');
    console.log('📋 Summary:');
    console.log('   JOB_APPLICATIONS: Users can create, read, update, delete');
    console.log('   JOBS: Users can create, read, update, delete');
    console.log('\n⚠️  IMPORTANT: Document-level security is enabled.');
    console.log('   Make sure your code sets proper document permissions when creating documents.');

  } catch (error) {
    console.error('❌ Error setting permissions:', error);
    throw error;
  }
}

// Run the setup
setupPermissions()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
