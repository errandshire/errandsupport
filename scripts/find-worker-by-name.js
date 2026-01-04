require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function searchWorkerByName() {
  console.log('🔍 Searching for workers with "Eyiowuawi" or "Muinat" in displayName...\n');

  // Fetch all worker profiles
  let allWorkers = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
      [Query.limit(limit), Query.offset(offset)]
    );

    allWorkers = allWorkers.concat(response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`📥 Fetched ${allWorkers.length} worker profiles\n`);

  // Search for matching names
  const matches = allWorkers.filter(w => {
    const name = (w.displayName || '').toLowerCase();
    return name.includes('eyiowuawi') || name.includes('muinat');
  });

  if (matches.length === 0) {
    console.log('❌ No workers found with "Eyiowuawi" or "Muinat" in displayName\n');
    console.log('🔍 Showing first 10 workers with documents:\n');

    const withDocs = allWorkers.filter(w => w.idDocument || w.selfieWithId).slice(0, 10);
    withDocs.forEach((w, index) => {
      console.log(`${index + 1}. ${w.displayName || 'No name'}`);
      console.log(`   Worker Doc ID: ${w.$id}`);
      console.log(`   userId:        ${w.userId}`);
      console.log(`   Has ID Doc:    ${w.idDocument ? 'YES' : 'NO'}`);
      console.log(`   Has Selfie:    ${w.selfieWithId ? 'YES' : 'NO'}`);
      console.log('');
    });
  } else {
    console.log(`✅ Found ${matches.length} matching worker(s):\n`);
    matches.forEach((w, index) => {
      console.log(`${index + 1}. ${w.displayName}`);
      console.log(`   Worker Doc ID: ${w.$id}`);
      console.log(`   userId:        ${w.userId}`);
      console.log(`   Has ID Doc:    ${w.idDocument ? 'YES' : 'NO'}`);
      console.log(`   Has Selfie:    ${w.selfieWithId ? 'YES' : 'NO'}`);
      console.log('');
    });
  }
}

searchWorkerByName();
