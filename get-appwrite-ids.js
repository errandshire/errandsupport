const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('686d2332000c59689987')
  .setKey('standard_84f6e2b80b2a4874e78455ac386fb053748dc975ce9e7a2b66939b680eba22da0142e156361eae572487f4612c022fb86ad2f76d5d0b437a5446b951c7ac1e62f66343df65daa82847bdceb58decd5d33ca2df5228c4d19c8674ffa676f50857485086432de3c287e4f572853db5478cb86f907264691c451e0ba780fe6b969e'); // Get this from Appwrite Console -> Settings -> API Keys

const databases = new Databases(client);

async function listAllCollections() {
  try {
    console.log('Fetching databases...\n');
    
    // List all databases
    const databasesList = await databases.list();
    
    for (const db of databasesList.databases) {
      console.log(`\n📦 Database: ${db.name}`);
      console.log(`   ID: ${db.$id}`);
      console.log(`   NEXT_PUBLIC_APPWRITE_DATABASE_ID=${db.$id}\n`);
      
      // List collections in this database
      const collections = await databases.listCollections(db.$id);
      
      console.log('   Collections:');
      for (const collection of collections.collections) {
        const envName = collection.name.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
        console.log(`   - ${collection.name}`);
        console.log(`     NEXT_PUBLIC_APPWRITE_${envName}_COLLECTION_ID=${collection.$id}`);
      }
    }
    
    console.log('\n✅ Done! Copy the IDs above to your .env.local file');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  You need to create an API key first:');
    console.log('1. Go to: https://fra.cloud.appwrite.io/console/project-686d2332000c59689987/settings');
    console.log('2. Click "API Keys" tab');
    console.log('3. Create a new API key with "Database" scope');
    console.log('4. Copy the key and replace YOUR_APPWRITE_API_KEY_HERE in this script');
  }
}

listAllCollections();
