# Verification Documents Migration Guide

## Issue Description

Previously, worker verification documents (ID document, selfie with ID, additional documents) were being stored in the **USERS collection** during the onboarding process. However, the admin interface expects these documents to be in the **WORKERS collection**.

This mismatch caused the admin interface to show "❌ Not uploaded" for all verification documents, even when they were actually uploaded and stored in the USERS collection.

## Root Cause

In the onboarding flow (`app/onboarding/page.tsx`), the `VerificationStep` was calling `updateProfile(verificationData)`, which stores data in the USERS collection. However, the admin interface (`app/(dashboard)/admin/users/page.tsx`) looks for verification documents in the WORKERS collection.

## Fix Applied

### 1. Updated Onboarding Flow

Modified `app/onboarding/page.tsx` in the `VerificationStep` to:

1. **Store verification documents in WORKERS collection** instead of USERS collection
2. **Only mark user as onboarded** in the USERS collection
3. **Maintain data consistency** between collections

```typescript
// Before (stored in USERS collection)
const result = await updateProfile(verificationData);

// After (stored in WORKERS collection)
await databases.updateDocument(
  DATABASE_ID,
  COLLECTIONS.WORKERS,
  existingWorkers.documents[0].$id,
  {
    idDocument: finalIdUrl,
    selfieWithId: finalSelfieUrl,
    additionalDocuments: joinDocumentUrls(additionalUrls),
    verificationStatus: 'pending',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
);

// Only mark user as onboarded
const result = await updateProfile({ isOnboarded: true });
```

### 2. Data Structure

**WORKERS Collection** now contains:
- `idDocument`: URL to uploaded ID document
- `selfieWithId`: URL to uploaded selfie with ID
- `additionalDocuments`: Comma-separated string of additional document URLs
- `verificationStatus`: 'pending', 'approved', 'rejected'
- `submittedAt`: Timestamp when documents were submitted

**USERS Collection** contains:
- `isOnboarded`: Boolean flag indicating onboarding completion
- Basic user profile information (name, email, phone, etc.)

## Migration for Existing Data

### Workers with Documents in USERS Collection

If you have existing workers whose verification documents are stored in the USERS collection, you'll need to migrate them to the WORKERS collection.

### Migration Script (Optional)

```typescript
// Migration script to move verification documents from USERS to WORKERS
async function migrateVerificationDocuments() {
  try {
    // Get all users with verification documents
    const usersWithDocs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS,
      [
        Query.isNotNull('idDocument'),
        Query.isNotNull('selfieWithId')
      ]
    );

    for (const user of usersWithDocs.documents) {
      // Find corresponding worker document
      const workers = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', user.$id)]
      );

      if (workers.documents.length > 0) {
        const worker = workers.documents[0];
        
        // Move verification documents to WORKERS collection
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          worker.$id,
          {
            idDocument: user.idDocument,
            selfieWithId: user.selfieWithId,
            additionalDocuments: user.additionalDocuments || '',
            verificationStatus: user.verificationStatus || 'pending',
            submittedAt: user.submittedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );

        // Remove verification documents from USERS collection
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          user.$id,
          {
            idDocument: null,
            selfieWithId: null,
            additionalDocuments: null,
            verificationStatus: null,
            submittedAt: null,
            updatedAt: new Date().toISOString(),
          }
        );

        console.log(`Migrated verification documents for user ${user.$id}`);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
```

## Testing

### 1. New Worker Onboarding
1. Create a new worker account
2. Complete the onboarding process including verification step
3. Check that documents are stored in WORKERS collection
4. Verify admin interface shows documents correctly

### 2. Admin Interface
1. Navigate to admin users page
2. Open worker details
3. Verify that verification documents show as "✅ Uploaded"
4. Test approve/reject functionality

### 3. Data Consistency
1. Check that USERS collection only contains `isOnboarded: true`
2. Check that WORKERS collection contains all verification documents
3. Verify no duplicate data between collections

## Prevention

### 1. Code Review
- Always ensure verification documents are stored in WORKERS collection
- Use `updateProfile` only for user profile data, not worker-specific data

### 2. Database Schema
- Consider adding unique constraints to prevent duplicate verification data
- Document which collection stores which type of data

### 3. Testing
- Add integration tests for onboarding flow
- Test admin interface with various worker states
- Verify data consistency between collections

## Related Files

- `app/onboarding/page.tsx` - Onboarding flow (fixed)
- `app/(dashboard)/admin/users/page.tsx` - Admin interface (already correct)
- `hooks/use-auth.ts` - User profile management
- `lib/utils.ts` - Document URL utilities

## Notes

- The fix is backward compatible
- Existing workers without migrated data will show as "Not uploaded" until migration
- New workers will work correctly immediately
- Consider running migration during maintenance window
