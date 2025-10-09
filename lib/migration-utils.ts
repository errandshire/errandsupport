import { databases, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';

/**
 * Migration utility to move verification documents from USERS collection to WORKERS collection
 * This fixes the issue where verification documents were stored in the wrong collection
 */
export class MigrationUtils {
  
  /**
   * Migrate verification documents from USERS to WORKERS collection
   */
  static async migrateVerificationDocuments(): Promise<{
    success: boolean;
    migrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      console.log('Starting verification documents migration...');

      // Get all users with verification documents in USERS collection
      const usersWithDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        [
          Query.isNotNull('idDocument'),
          Query.isNotNull('selfieWithId')
        ]
      );

      console.log(`Found ${usersWithDocs.documents.length} users with verification documents`);

      for (const user of usersWithDocs.documents) {
        try {
          // Find corresponding worker document
          const workers = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.WORKERS,
            [Query.equal('userId', user.$id)]
          );

          if (workers.documents.length === 0) {
            console.log(`No worker document found for user ${user.$id}, skipping...`);
            continue;
          }

          const worker = workers.documents[0];
          
          // Check if worker already has verification documents
          if (worker.idDocument && worker.selfieWithId) {
            console.log(`Worker ${worker.$id} already has verification documents, skipping...`);
            continue;
          }

          // Move verification documents to WORKERS collection
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
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
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
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

          migrated++;
          console.log(`✅ Migrated verification documents for user ${user.$id} (worker ${worker.$id})`);

        } catch (error) {
          const errorMsg = `Failed to migrate user ${user.$id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Migration completed. Migrated ${migrated} users, ${errors.length} errors`);
      
      return {
        success: errors.length === 0,
        migrated,
        errors
      };

    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        success: false,
        migrated,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Check migration status - see how many users need migration
   */
  static async checkMigrationStatus(): Promise<{
    usersWithDocs: number;
    workersWithDocs: number;
    needsMigration: number;
  }> {
    try {
      // Count users with verification documents
      const usersWithDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        [
          Query.isNotNull('idDocument'),
          Query.isNotNull('selfieWithId')
        ]
      );

      // Count workers with verification documents
      const workersWithDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [
          Query.isNotNull('idDocument'),
          Query.isNotNull('selfieWithId')
        ]
      );

      return {
        usersWithDocs: usersWithDocs.documents.length,
        workersWithDocs: workersWithDocs.documents.length,
        needsMigration: usersWithDocs.documents.length
      };

    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        usersWithDocs: 0,
        workersWithDocs: 0,
        needsMigration: 0
      };
    }
  }

  /**
   * Get specific user's verification documents for debugging
   */
  static async getUserVerificationData(userId: string): Promise<{
    user: any;
    worker: any;
    hasUserDocs: boolean;
    hasWorkerDocs: boolean;
  }> {
    try {
      // Get user document
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        userId
      );

      // Get worker document
      const workers = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', userId)]
      );

      const worker = workers.documents.length > 0 ? workers.documents[0] : null;

      return {
        user,
        worker,
        hasUserDocs: !!(user.idDocument && user.selfieWithId),
        hasWorkerDocs: !!(worker?.idDocument && worker?.selfieWithId)
      };

    } catch (error) {
      console.error('Error getting user verification data:', error);
      return {
        user: null,
        worker: null,
        hasUserDocs: false,
        hasWorkerDocs: false
      };
    }
  }
}
