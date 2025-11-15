/**
 * SMS TEST SCRIPT
 *
 * This script tests if your Twilio SMS configuration is working correctly.
 *
 * Usage:
 * 1. Ensure you have added Twilio credentials to .env or .env.local
 * 2. Update TEST_PHONE_NUMBER below with your phone number
 * 3. Run: npx tsx scripts/test-sms.ts
 */

// Load environment variables from .env file
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from project root
config({ path: resolve(__dirname, '../.env') });
// Also try .env.local if it exists
config({ path: resolve(__dirname, '../.env.local') });

import { SMSService } from '../lib/sms.service';

// ⚠️ UPDATE THIS with your test phone number (Nigerian format)
const TEST_PHONE_NUMBER = '08012345678'; // Replace with your actual number

async function testSMSConfiguration() {
  console.log('🔍 Testing SMS Configuration...\n');

  // Step 1: Check environment variables
  console.log('1️⃣ Checking Environment Variables:');
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log(`   TWILIO_ACCOUNT_SID: ${accountSid ? '✅ Set' : '❌ Missing'}`);
  console.log(`   TWILIO_AUTH_TOKEN: ${authToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`   TWILIO_PHONE_NUMBER: ${phoneNumber ? '✅ ' + phoneNumber : '❌ Missing'}`);

  if (!accountSid || !authToken || !phoneNumber) {
    console.log('\n❌ SMS service not configured properly!');
    console.log('\nTo fix this, add these to your .env.local file:');
    console.log(`
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
    `);
    console.log('See SMS_SETUP.md for detailed instructions.');
    return;
  }

  // Step 2: Validate phone number format
  console.log('\n2️⃣ Validating Test Phone Number:');
  const isValid = SMSService.isValidNigerianPhone(TEST_PHONE_NUMBER);
  console.log(`   Test Number: ${TEST_PHONE_NUMBER}`);
  console.log(`   Valid Format: ${isValid ? '✅ Yes' : '❌ No'}`);

  if (!isValid) {
    console.log('\n❌ Invalid phone number format!');
    console.log('Use format: 08012345678 (11 digits) or 2348012345678 (13 digits)');
    return;
  }

  // Step 3: Send test SMS
  console.log('\n3️⃣ Sending Test SMS...');
  console.log(`   Sending to: ${TEST_PHONE_NUMBER}`);

  const result = await SMSService.sendSMS({
    to: TEST_PHONE_NUMBER,
    message: '🎉 Test SMS from ErrandSupport! Your Twilio integration is working correctly.'
  });

  console.log('\n4️⃣ Result:');
  if (result.success) {
    console.log('   ✅ SMS sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Status: ${result.message}`);
    console.log('\n✨ Check your phone for the test message!');
  } else {
    console.log('   ❌ SMS failed to send');
    console.log(`   Error: ${result.error}`);
    console.log('\nTroubleshooting:');
    console.log('1. Check your Twilio account balance');
    console.log('2. Verify your credentials are correct');
    console.log('3. Check if your phone number is verified (for trial accounts)');
    console.log('4. Review Twilio console logs: https://console.twilio.com/');
  }

  // Step 5: Test notification SMS
  console.log('\n5️⃣ Testing Notification SMS Templates:');

  console.log('\n   Testing Payment Notification...');
  const paymentResult = await SMSService.sendPaymentNotification(TEST_PHONE_NUMBER, {
    amount: 5000,
    type: 'received',
    reference: 'TEST123'
  });
  console.log(`   ${paymentResult.success ? '✅' : '❌'} Payment SMS: ${paymentResult.success ? 'Sent' : paymentResult.error}`);

  console.log('\n   Testing Dispute Notification...');
  const disputeResult = await SMSService.sendDisputeNotification(TEST_PHONE_NUMBER, {
    bookingId: 'BOOK123',
    status: 'raised',
    role: 'worker'
  });
  console.log(`   ${disputeResult.success ? '✅' : '❌'} Dispute SMS: ${disputeResult.success ? 'Sent' : disputeResult.error}`);

  console.log('\n✅ SMS Test Complete!');
}

// Run the test
testSMSConfiguration()
  .then(() => {
    console.log('\n📝 Summary: Check the output above for any errors.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  });
