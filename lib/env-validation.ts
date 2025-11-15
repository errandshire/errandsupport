/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on app startup
 * Fails fast if critical variables are missing
 */

export function validateEnvVariables() {
  const required = {
    // Appwrite
    'NEXT_PUBLIC_APPWRITE_ENDPOINT': process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID': process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,

    // Paystack
    'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY': process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    'PAYSTACK_SECRET_KEY': process.env.PAYSTACK_SECRET_KEY,

    // Termii SMS
    'TERMII_API_KEY': process.env.TERMII_API_KEY,
    'TERMII_SENDER_ID': process.env.TERMII_SENDER_ID,
  };

  const missing: string[] = [];

  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error(`Missing ${missing.length} required environment variable(s)`);
  }

  console.log('✅ All required environment variables are set');
}

// Auto-validate in development
if (process.env.NODE_ENV === 'development') {
  validateEnvVariables();
}
