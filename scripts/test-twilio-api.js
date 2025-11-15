// Direct Twilio API Test
require('dotenv').config({ path: '.env' });

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Update this with YOUR phone number to test
const TEST_PHONE = '+2348012345678'; // ⚠️ CHANGE THIS to your number

async function testTwilioAPI() {
  console.log('🔍 Testing Twilio API...\n');

  // Step 1: Check credentials
  console.log('1️⃣ Credentials Check:');
  console.log(`   Account SID: ${ACCOUNT_SID ? '✅ ' + ACCOUNT_SID : '❌ Missing'}`);
  console.log(`   Auth Token: ${AUTH_TOKEN ? '✅ ' + AUTH_TOKEN.substring(0, 8) + '...' : '❌ Missing'}`);
  console.log(`   From Number: ${FROM_NUMBER ? '✅ ' + FROM_NUMBER : '❌ Missing'}`);

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.log('\n❌ Credentials missing!');
    return;
  }

  // Step 2: Test API connection
  console.log('\n2️⃣ Testing Twilio API Connection...');

  const authHeader = 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');

  try {
    // First, verify the account by fetching account details
    console.log('   Verifying account...');
    const accountResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}.json`, {
      headers: {
        'Authorization': authHeader
      }
    });

    const accountData = await accountResponse.json();

    if (accountResponse.ok) {
      console.log(`   ✅ Account verified: ${accountData.friendly_name || 'Twilio Account'}`);
      console.log(`   Status: ${accountData.status}`);
      console.log(`   Type: ${accountData.type}`);
    } else {
      console.log(`   ❌ Account verification failed!`);
      console.log(`   Status: ${accountResponse.status}`);
      console.log(`   Error: ${accountData.message || accountData.error || 'Unknown error'}`);
      if (accountData.code) console.log(`   Code: ${accountData.code}`);
      return;
    }

    // Step 3: Send test SMS
    console.log('\n3️⃣ Sending Test SMS...');
    console.log(`   To: ${TEST_PHONE}`);
    console.log(`   From: ${FROM_NUMBER}`);

    const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: TEST_PHONE,
        From: FROM_NUMBER,
        Body: 'Test SMS from ErrandSupport via Twilio! 🎉'
      }),
    });

    const smsData = await smsResponse.json();

    if (smsResponse.ok && smsData.sid) {
      console.log('\n   ✅ SMS sent successfully!');
      console.log(`   Message SID: ${smsData.sid}`);
      console.log(`   Status: ${smsData.status}`);
      console.log(`   Price: ${smsData.price || 'Pending'} ${smsData.price_unit || ''}`);
      console.log('\n   📱 Check your phone for the message!');
    } else {
      console.log('\n   ❌ SMS failed to send!');
      console.log(`   Status: ${smsResponse.status}`);
      console.log(`   Error: ${smsData.message || 'Unknown error'}`);
      if (smsData.code) console.log(`   Code: ${smsData.code}`);
      if (smsData.more_info) console.log(`   More info: ${smsData.more_info}`);

      // Common error explanations
      if (smsData.code === 21211) {
        console.log('\n   ℹ️  Invalid phone number. Make sure it\'s in format: +2348012345678');
      } else if (smsData.code === 21608) {
        console.log('\n   ℹ️  Phone number is not verified. For trial accounts, verify it at:');
        console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      } else if (smsData.code === 20003) {
        console.log('\n   ℹ️  Authentication failed. Check your credentials.');
      } else if (smsData.code === 21606) {
        console.log('\n   ℹ️  From number is not a valid Twilio number.');
      }
    }

  } catch (error) {
    console.error('\n💥 Error:', error.message);
  }
}

testTwilioAPI();
