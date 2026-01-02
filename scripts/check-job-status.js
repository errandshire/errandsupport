require('dotenv').config();
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const jobsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID;

async function checkJobStatus() {
  console.log('🔍 Checking job statuses in database...\n');

  try {
    // Get all jobs
    const response = await databases.listDocuments(
      databaseId,
      jobsCollectionId,
      [Query.limit(100)]
    );

    console.log(`📋 Found ${response.documents.length} jobs\n`);

    response.documents.forEach((job, index) => {
      console.log(`Job #${index + 1}:`);
      console.log(`  ID: ${job.$id}`);
      console.log(`  Title: ${job.title}`);
      console.log(`  Status: "${job.status}" (type: ${typeof job.status})`);
      console.log(`  Status === 'open': ${job.status === 'open'}`);
      console.log(`  Assigned Worker: ${job.assignedWorkerId || 'None'}`);
      console.log(`  Created: ${job.$createdAt}`);
      console.log('---');
    });

    // Check for any jobs with non-standard status values
    const nonOpenJobs = response.documents.filter(job => job.status !== 'open');
    console.log(`\n⚠️  Jobs with status !== 'open': ${nonOpenJobs.length}`);

    const openJobs = response.documents.filter(job => job.status === 'open');
    console.log(`✅ Jobs with status === 'open': ${openJobs.length}`);

    if (openJobs.length > 0) {
      console.log('\n✅ Open Jobs Details:');
      openJobs.forEach(job => {
        console.log(`  - ${job.title} (ID: ${job.$id}, Status: "${job.status}")`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkJobStatus()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
