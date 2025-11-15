/**
 * Quick script to add phone number to a user
 *
 * Usage:
 * 1. Update the userId and phoneNumber below
 * 2. Run: npx ts-node scripts/add-phone-number.ts
 */

import { databases, COLLECTIONS } from '../lib/appwrite';

async function addPhoneNumber() {
  // UPDATE THESE VALUES
  const userId = '68e77c6a001db71648a3'; // The user ID from the logs
  const phoneNumber = '08063451985'; // Your phone number

  try {
    console.log('📞 Adding phone number to user:', userId);

    const updatedUser = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.USERS,
      userId,
      {
        phone: phoneNumber
      }
    );

    console.log('✅ Phone number added successfully!');
    console.log('User:', {
      id: updatedUser.$id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone
    });

  } catch (error) {
    console.error('❌ Error adding phone number:', error);
  }
}

addPhoneNumber();
