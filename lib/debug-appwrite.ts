// Debug script to check Appwrite configuration
export function debugAppwriteConfig() {
  console.log('🔍 Appwrite Configuration Debug:');
  console.log('Endpoint:', "");
  console.log('Project ID:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  console.log('Database ID:', DATABASE_ID);
  
  if (!"") {
    console.error('❌ NEXT_PUBLIC_APPWRITE_ENDPOINT is not defined!');
  }
  
  if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    console.error('❌ NEXT_PUBLIC_APPWRITE_PROJECT_ID is not defined!');
  }
  
  // Test if endpoint is reachable
  if (typeof window !== 'undefined') {
    fetch(`${""}/health`)
      .then(response => {
        console.log('✅ Appwrite endpoint is reachable:', response.ok);
        return response.json();
      })
      .then(data => console.log('Health check:', data))
      .catch(error => {
        console.error('❌ Cannot reach Appwrite endpoint:', error);
        console.error('This could be a CORS issue or network problem');
      });
  }
}
