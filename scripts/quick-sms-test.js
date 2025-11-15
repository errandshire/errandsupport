// Quick SMS Test - No build required
require('dotenv').config({ path: '.env' });

console.log('🔍 Checking Twilio Configuration:\n');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ ' + process.env.TWILIO_ACCOUNT_SID : '❌ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ ' + process.env.TWILIO_AUTH_TOKEN.substring(0, 10) + '...' : '❌ Missing');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✅ ' + process.env.TWILIO_PHONE_NUMBER : '❌ Missing');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.log('\n❌ Twilio not configured properly!');
  process.exit(1);
}

console.log('\n✅ All Twilio credentials are loaded correctly!');
console.log('\n💡 Next step: Restart your Next.js dev server with "npm run dev"');
