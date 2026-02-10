/**
 * Setup script to create Partner Program collections in Appwrite
 *
 * Creates 3 collections:
 * 1. PARTNERS - Growth partner profiles
 * 2. REFERRALS - Tracks partner-to-client referrals
 * 3. PARTNER_COMMISSIONS - Commission records per completed booking
 *
 * Also adds `referredByPartnerCode` attribute to existing USERS collection.
 *
 * Usage:
 * 1. Make sure you have your Appwrite admin API key in .env
 * 2. Run: node scripts/setup-partner-collections.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client, Databases, ID } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;

async function setupPartnerCollections() {
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

  console.log('🚀 Starting Partner Program collections setup...\n');

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  const collectionIds = {};

  try {
    // ============================================
    // 1. PARTNERS Collection
    // ============================================
    console.log('📦 Creating PARTNERS collection...');
    const partnersCollection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'partners',
      [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")'
      ]
    );
    collectionIds.PARTNERS = partnersCollection.$id;
    console.log(`✅ PARTNERS collection created: ${collectionIds.PARTNERS}\n`);

    console.log('📝 Creating PARTNERS attributes...');
    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'name', 255, true);
    console.log('  ✓ name (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'email', 255, true);
    console.log('  ✓ email (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'phone', 50, false);
    console.log('  ✓ phone (string, 50, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'partnerCode', 20, true);
    console.log('  ✓ partnerCode (string, 20, required)');

    await databases.createEnumAttribute(
      DATABASE_ID, collectionIds.PARTNERS, 'status',
      ['pending', 'active', 'suspended', 'removed'],
      false, 'active'
    );
    console.log('  ✓ status (enum, default: active)');

    await databases.createIntegerAttribute(DATABASE_ID, collectionIds.PARTNERS, 'totalReferrals', false, 0);
    console.log('  ✓ totalReferrals (integer, default: 0)');

    await databases.createFloatAttribute(DATABASE_ID, collectionIds.PARTNERS, 'totalEarnings', false, 0);
    console.log('  ✓ totalEarnings (float, default: 0)');

    await databases.createFloatAttribute(DATABASE_ID, collectionIds.PARTNERS, 'pendingPayout', false, 0);
    console.log('  ✓ pendingPayout (float, default: 0)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'bankAccountName', 255, false);
    console.log('  ✓ bankAccountName (string, 255, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'bankName', 255, false);
    console.log('  ✓ bankName (string, 255, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'accountNumber', 20, false);
    console.log('  ✓ accountNumber (string, 20, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'notes', 1000, false);
    console.log('  ✓ notes (string, 1000, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'experience', 1000, false);
    console.log('  ✓ experience (string, 1000, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'createdAt', 50, true);
    console.log('  ✓ createdAt (string, 50, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNERS, 'updatedAt', 50, true);
    console.log('  ✓ updatedAt (string, 50, required)');

    // Wait for attributes to be available before creating indexes
    console.log('\n⏳ Waiting for PARTNERS attributes to be available...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Creating PARTNERS indexes...');
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.PARTNERS, 'partnerCode_unique', 'unique', ['partnerCode']);
      console.log('  ✓ partnerCode_unique (unique index)');
    } catch (error) {
      console.log('  ⚠ partnerCode_unique index (may already exist)');
    }
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.PARTNERS, 'email_index', 'key', ['email']);
      console.log('  ✓ email_index');
    } catch (error) {
      console.log('  ⚠ email_index (may already exist)');
    }
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.PARTNERS, 'status_index', 'key', ['status']);
      console.log('  ✓ status_index');
    } catch (error) {
      console.log('  ⚠ status_index (may already exist)');
    }

    // ============================================
    // 2. REFERRALS Collection
    // ============================================
    console.log('\n📦 Creating REFERRALS collection...');
    const referralsCollection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'referrals',
      [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")'
      ]
    );
    collectionIds.REFERRALS = referralsCollection.$id;
    console.log(`✅ REFERRALS collection created: ${collectionIds.REFERRALS}\n`);

    console.log('📝 Creating REFERRALS attributes...');
    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'partnerCode', 20, true);
    console.log('  ✓ partnerCode (string, 20, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'partnerId', 255, true);
    console.log('  ✓ partnerId (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'clientId', 255, true);
    console.log('  ✓ clientId (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'clientEmail', 255, true);
    console.log('  ✓ clientEmail (string, 255, required)');

    await databases.createEnumAttribute(
      DATABASE_ID, collectionIds.REFERRALS, 'status',
      ['active', 'expired', 'fraud'],
      false, 'active'
    );
    console.log('  ✓ status (enum, default: active)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'firstCompletedJobAt', 50, false);
    console.log('  ✓ firstCompletedJobAt (string, 50, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'commissionWindowEndsAt', 50, false);
    console.log('  ✓ commissionWindowEndsAt (string, 50, optional)');

    await databases.createFloatAttribute(DATABASE_ID, collectionIds.REFERRALS, 'totalCommissionEarned', false, 0);
    console.log('  ✓ totalCommissionEarned (float, default: 0)');

    await databases.createIntegerAttribute(DATABASE_ID, collectionIds.REFERRALS, 'jobsCompleted', false, 0);
    console.log('  ✓ jobsCompleted (integer, default: 0)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'createdAt', 50, true);
    console.log('  ✓ createdAt (string, 50, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.REFERRALS, 'updatedAt', 50, true);
    console.log('  ✓ updatedAt (string, 50, required)');

    console.log('\n⏳ Waiting for REFERRALS attributes to be available...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Creating REFERRALS indexes...');
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.REFERRALS, 'clientId_unique', 'unique', ['clientId']);
      console.log('  ✓ clientId_unique (unique index)');
    } catch (error) {
      console.log('  ⚠ clientId_unique index (may already exist)');
    }
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.REFERRALS, 'partnerId_index', 'key', ['partnerId']);
      console.log('  ✓ partnerId_index');
    } catch (error) {
      console.log('  ⚠ partnerId_index (may already exist)');
    }
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.REFERRALS, 'partnerCode_index', 'key', ['partnerCode']);
      console.log('  ✓ partnerCode_index');
    } catch (error) {
      console.log('  ⚠ partnerCode_index (may already exist)');
    }

    // ============================================
    // 3. PARTNER_COMMISSIONS Collection
    // ============================================
    console.log('\n📦 Creating PARTNER_COMMISSIONS collection...');
    const commissionsCollection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'partner_commissions',
      [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")'
      ]
    );
    collectionIds.PARTNER_COMMISSIONS = commissionsCollection.$id;
    console.log(`✅ PARTNER_COMMISSIONS collection created: ${collectionIds.PARTNER_COMMISSIONS}\n`);

    console.log('📝 Creating PARTNER_COMMISSIONS attributes...');
    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'referralId', 255, true);
    console.log('  ✓ referralId (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'partnerId', 255, true);
    console.log('  ✓ partnerId (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'partnerCode', 20, true);
    console.log('  ✓ partnerCode (string, 20, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'clientId', 255, true);
    console.log('  ✓ clientId (string, 255, required)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'bookingId', 255, true);
    console.log('  ✓ bookingId (string, 255, required)');

    await databases.createFloatAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'jobAmount', true);
    console.log('  ✓ jobAmount (float, required)');

    await databases.createFloatAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'commissionRate', true);
    console.log('  ✓ commissionRate (float, required)');

    await databases.createFloatAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'commissionAmount', true);
    console.log('  ✓ commissionAmount (float, required)');

    await databases.createEnumAttribute(
      DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'status',
      ['pending', 'paid', 'cancelled'],
      false, 'pending'
    );
    console.log('  ✓ status (enum, default: pending)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'payoutMonth', 10, false);
    console.log('  ✓ payoutMonth (string, 10, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'paidAt', 50, false);
    console.log('  ✓ paidAt (string, 50, optional)');

    await databases.createStringAttribute(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'createdAt', 50, true);
    console.log('  ✓ createdAt (string, 50, required)');

    console.log('\n⏳ Waiting for PARTNER_COMMISSIONS attributes to be available...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Creating PARTNER_COMMISSIONS indexes...');
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'partnerId_index', 'key', ['partnerId']);
      console.log('  ✓ partnerId_index');
    } catch (error) {
      console.log('  ⚠ partnerId_index (may already exist)');
    }
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'bookingId_index', 'key', ['bookingId']);
      console.log('  ✓ bookingId_index');
    } catch (error) {
      console.log('  ⚠ bookingId_index (may already exist)');
    }
    try {
      await databases.createIndex(DATABASE_ID, collectionIds.PARTNER_COMMISSIONS, 'status_index', 'key', ['status']);
      console.log('  ✓ status_index');
    } catch (error) {
      console.log('  ⚠ status_index (may already exist)');
    }

    // ============================================
    // 4. Add referredByPartnerCode to USERS collection
    // ============================================
    if (USERS_COLLECTION_ID) {
      console.log('\n📝 Adding referredByPartnerCode to USERS collection...');
      try {
        await databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'referredByPartnerCode', 20, false);
        console.log('  ✓ referredByPartnerCode (string, 20, optional)');
      } catch (error) {
        if (error.message?.includes('already exists') || error.code === 409) {
          console.log('  ⚠ referredByPartnerCode already exists on USERS collection');
        } else {
          console.error('  ❌ Failed to add referredByPartnerCode:', error.message);
        }
      }
    } else {
      console.log('\n⚠ USERS_COLLECTION_ID not set, skipping referredByPartnerCode attribute');
    }

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Partner Program collections setup completed!\n');
    console.log('📋 Add these to your .env file:\n');
    console.log(`NEXT_PUBLIC_APPWRITE_PARTNERS_COLLECTION_ID=${collectionIds.PARTNERS}`);
    console.log(`NEXT_PUBLIC_APPWRITE_REFERRALS_COLLECTION_ID=${collectionIds.REFERRALS}`);
    console.log(`NEXT_PUBLIC_APPWRITE_PARTNER_COMMISSIONS_COLLECTION_ID=${collectionIds.PARTNER_COMMISSIONS}`);
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error setting up Partner Program collections:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    console.log('\nCollections created so far:', collectionIds);
    process.exit(1);
  }
}

setupPartnerCollections();
