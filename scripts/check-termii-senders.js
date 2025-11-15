// Check available Termii Sender IDs
require('dotenv').config({ path: '.env' });

const TERMII_API_KEY = process.env.TERMII_API_KEY;

async function checkSenderIds() {
  console.log('🔍 Checking your Termii Sender IDs...\n');

  if (!TERMII_API_KEY) {
    console.log('❌ TERMII_API_KEY not configured!');
    return;
  }

  try {
    const response = await fetch(`https://v3.api.termii.com/api/sender-id?api_key=${TERMII_API_KEY}`);
    const data = await response.json();

    if (response.ok && data.data && data.data.length > 0) {
      console.log(`✅ Found ${data.data.length} registered Sender ID(s):\n`);

      data.data.forEach((sender, index) => {
        console.log(`${index + 1}. ${sender.sender_id}`);
        console.log(`   Status: ${sender.status}`);
        console.log(`   Created: ${sender.created_at}`);
        console.log('');
      });

      console.log('💡 Update your .env file with one of these sender IDs:');
      console.log(`   TERMII_SENDER_ID=${data.data[0].sender_id}`);
    } else {
      console.log('❌ No sender IDs found in your Termii account!\n');
      console.log('📝 You need to register a sender ID:');
      console.log('1. Go to: https://accounts.termii.com/sender-id');
      console.log('2. Click "Request Sender ID"');
      console.log('3. Enter your desired name (e.g., ErrandWork)');
      console.log('4. Wait for approval (usually instant for test, few hours for live)');
      console.log('5. Update TERMII_SENDER_ID in .env\n');

      console.log('💡 Temporary workaround: Use "generic" sender (may show random number):');
      console.log('   TERMII_SENDER_ID=N-Alert');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

checkSenderIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
