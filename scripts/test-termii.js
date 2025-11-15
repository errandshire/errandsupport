// Quick Termii SMS Test
require('dotenv').config({ path: '.env' });

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'ErrandWork';
const TERMII_CHANNEL = process.env.TERMII_CHANNEL || 'dnd';

// ⚠️ UPDATE THIS with YOUR phone number (e.g., 08012345678 or 2348012345678)
const TEST_PHONE = '08063451985';

function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');

  // Nigerian number starting with 0
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.substring(1);
  }

  // Already in international format
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return cleaned;
  }

  return null;
}

async function testTermii() {
  console.log('🔍 Testing Termii SMS Service...\n');

  // Step 1: Check credentials
  console.log('1️⃣ Credentials Check:');
  console.log(`   API Key: ${TERMII_API_KEY ? '✅ ' + TERMII_API_KEY.substring(0, 20) + '...' : '❌ Missing'}`);
  console.log(`   Sender ID: ${TERMII_SENDER_ID ? '✅ ' + TERMII_SENDER_ID : '❌ Missing'}`);
  console.log(`   Channel: ${TERMII_CHANNEL ? '✅ ' + TERMII_CHANNEL : '❌ Missing (defaults to dnd)'}`);

  if (!TERMII_API_KEY) {
    console.log('\n❌ Termii API key not configured!');
    console.log('\nAdd to .env file:');
    console.log('TERMII_API_KEY=your_api_key_here');
    console.log('TERMII_SENDER_ID=ErrandWork');
    return;
  }

  // Step 2: Check balance
  console.log('\n2️⃣ Checking Account Balance...');
  try {
    const balanceResponse = await fetch(`https://v3.api.termii.com/api/get-balance?api_key=${TERMII_API_KEY}`);
    const balanceData = await balanceResponse.json();

    if (balanceResponse.ok && balanceData.balance !== undefined) {
      console.log(`   ✅ Balance: ${balanceData.currency || 'NGN'} ${parseFloat(balanceData.balance).toFixed(2)}`);
    } else {
      console.log(`   ⚠️  Could not fetch balance: ${balanceData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not fetch balance: ${error.message}`);
  }

  // Step 3: Validate phone number
  console.log('\n3️⃣ Validating Test Phone Number:');
  const formattedPhone = formatPhoneNumber(TEST_PHONE);
  console.log(`   Test Number: ${TEST_PHONE}`);
  console.log(`   Formatted: ${formattedPhone || '❌ Invalid'}`);

  if (!formattedPhone) {
    console.log('\n❌ Invalid phone number format!');
    console.log('Use format: 08012345678 (11 digits) or 2348012345678 (13 digits)');
    return;
  }

  // Step 4: Send test SMS
  console.log('\n4️⃣ Sending Test SMS...');
  console.log(`   To: ${formattedPhone}`);
  console.log(`   From: ${TERMII_SENDER_ID}`);

  try {
    const response = await fetch('https://v3.api.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: '🎉 Test SMS from ErandWork! Your Termii integration is working perfectly.',
        type: 'plain',
        channel: TERMII_CHANNEL,
        api_key: TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    console.log('\n5️⃣ Result:');
    if (response.ok && data.message_id) {
      console.log('   ✅ SMS sent successfully!');
      console.log(`   Message ID: ${data.message_id}`);
      console.log(`   Balance: ${data.balance || 'N/A'}`);
      console.log('\n   📱 Check your phone for the test message!');
    } else {
      console.log('   ❌ SMS failed to send!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.message || JSON.stringify(data)}`);

      if (data.message?.includes('Insufficient')) {
        console.log('\n   💡 Your Termii account balance is low. Add funds at:');
        console.log('   https://accounts.termii.com');
      }
    }
  } catch (error) {
    console.log('\n   ❌ Request failed!');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n✅ Test Complete!');
}

testTermii()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
