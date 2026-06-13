import { NextRequest, NextResponse } from 'next/server';
import { MigrationUtils } from '@/lib/migration-utils';

/**
 * API endpoint to create missing worker documents
 * Use this after database restore to fix workers who lost their WORKERS documents
 * 
 * Usage: POST /api/migrate/workers
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting worker documents migration...');
    
    const result = await MigrationUtils.createMissingWorkerDocuments();
    
    if (result.success) {
      console.log(`✅ Migration successful! Created ${result.created} worker documents`);
      return NextResponse.json({
        success: true,
        message: `Successfully created ${result.created} worker documents`,
        created: result.created,
        errors: []
      });
    } else {
      console.error(`⚠️ Migration completed with errors. Created ${result.created} worker documents, ${result.errors.length} errors`);
      return NextResponse.json({
        success: false,
        message: `Migration completed with errors. Created ${result.created} worker documents`,
        created: result.created,
        errors: result.errors
      }, { status: 207 }); // 207 Multi-Status
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Migration failed',
      created: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check migration status
 */
export async function GET(request: NextRequest) {
  try {
    const { databases, DATABASE_ID, COLLECTIONS, Query } = await import('@/lib/db');
    
    // Count worker users
    const workerUsers = await databases.listDocuments(
      DATABASE_ID!,
      COLLECTIONS.USERS,
      [Query.equal('role', 'worker'), Query.limit(500)]
    );
    
    // Count worker documents
    const workerDocs = await databases.listDocuments(
      DATABASE_ID!,
      COLLECTIONS.WORKERS,
      [Query.limit(500)]
    );
    
    const missing = workerUsers.documents.length - workerDocs.documents.length;
    
    return NextResponse.json({
      workerUsers: workerUsers.documents.length,
      workerDocuments: workerDocs.documents.length,
      missingDocuments: missing > 0 ? missing : 0,
      needsMigration: missing > 0
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check status'
    }, { status: 500 });
  }
}
