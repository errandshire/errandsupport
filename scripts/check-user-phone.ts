/**
 * Check user's phone number
 *
 * Usage: node --loader ts-node/esm scripts/check-user-phone.ts
 * OR just check in Appwrite Console
 */

import { Client, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

async function checkUserPhone() {
  const userId = '68e77c6a001db71648a3'; // From the logs
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const usersCollectionId = '68e761ce001f8f4e3f01'; // USERS collection ID

  try {
    console.log('🔍 Fetching user data for:', userId);

    const user = await databases.getDocument(
      databaseId,
      usersCollectionId,
      userId
    );

    console.log('\n📋 User Data:');
    console.log('=====================================');
    console.log('ID:', user.$id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Phone:', user.phone);
    console.log('Phone type:', typeof user.phone);
    console.log('Phone is null?', user.phone === null);
    console.log('Phone is undefined?', user.phone === undefined);
    console.log('Phone is empty string?', user.phone === '');
    console.log('=====================================');

    console.log('\n📄 Full user object:');
    console.log(JSON.stringify(user, null, 2));

  } catch (error) {
    console.error('❌ Error fetching user:', error);
  }
}

checkUserPhone();
