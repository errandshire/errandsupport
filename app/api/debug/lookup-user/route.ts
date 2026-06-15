import { NextRequest, NextResponse } from 'next/server';
import { databases, COLLECTIONS, DATABASE_ID} from '@/lib/api';
import { Query } from '@/lib/api';

/**
 * Debug endpoint to look up user and worker information
 * 
 * Usage: 
 * GET /api/debug/lookup-user?email=user@example.com
 * GET /api/debug/lookup-user?userId=123456
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json({
        error: 'Please provide either email or userId parameter'
      }, { status: 400 });
    }

    const result: any = {
      searchCriteria: email ? { email } : { userId },
      user: null,
      worker: null,
      hasWorkerDocument: false,
      timestamp: new Date().toISOString()
    };

    // Look up user
    if (email) {
      console.log(`🔍 Looking up user by email: ${email}`);
      
      const users = await databases.listDocuments(
        DATABASE_ID!,
        COLLECTIONS.USERS,
        [Query.equal('email', email), Query.limit(1)]
      );

      if (users.documents.length > 0) {
        result.user = users.documents[0];
        console.log(`✅ Found user: ${result.user.$id}`);
      } else {
        console.log(`❌ No user found with email: ${email}`);
        result.error = 'User not found';
      }
    } else if (userId) {
      console.log(`🔍 Looking up user by ID: ${userId}`);
      
      try {
        result.user = await databases.getDocument(
          DATABASE_ID!,
          COLLECTIONS.USERS,
          userId
        );
        console.log(`✅ Found user: ${result.user.$id}`);
      } catch (error) {
        console.log(`❌ No user found with ID: ${userId}`);
        result.error = 'User not found';
      }
    }

    // If user found and is a worker, look up worker document
    if (result.user && result.user.role === 'worker') {
      console.log(`🔍 User is a worker, looking up worker document...`);
      
      const workers = await databases.listDocuments(
        DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', result.user.$id), Query.limit(1)]
      );

      if (workers.documents.length > 0) {
        result.worker = workers.documents[0];
        result.hasWorkerDocument = true;
        console.log(`✅ Found worker document: ${result.worker.$id}`);
      } else {
        result.hasWorkerDocument = false;
        console.log(`❌ No worker document found for user: ${result.user.$id}`);
        result.workerError = 'Worker document missing - this is why they cannot apply for jobs!';
      }
    }

    // Summary
    result.summary = {
      userExists: !!result.user,
      userRole: result.user?.role || null,
      isWorker: result.user?.role === 'worker',
      hasWorkerDocument: result.hasWorkerDocument,
      canApplyForJobs: result.user?.role === 'worker' && result.hasWorkerDocument,
      needsMigration: result.user?.role === 'worker' && !result.hasWorkerDocument
    };

    console.log('📊 Summary:', result.summary);

    return NextResponse.json(result, { 
      status: result.user ? 200 : 404 
    });

  } catch (error) {
    console.error('❌ Lookup error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Lookup failed',
      details: error
    }, { status: 500 });
  }
}

/**
 * POST endpoint to list all users (with pagination)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, limit = 25, offset = 0 } = body;

    console.log(`📋 Listing users - Role: ${role || 'all'}, Limit: ${limit}, Offset: ${offset}`);

    const queries = [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('$createdAt')
    ];

    if (role) {
      queries.push(Query.equal('role', role));
    }

    const users = await databases.listDocuments(
      DATABASE_ID!,
      COLLECTIONS.USERS,
      queries
    );

    // For workers, check if they have worker documents
    const usersWithWorkerStatus = await Promise.all(
      users.documents.map(async (user) => {
        if (user.role === 'worker') {
          const workers = await databases.listDocuments(
            DATABASE_ID!,
            COLLECTIONS.WORKERS,
            [Query.equal('userId', user.$id), Query.limit(1)]
          );
          
          return {
            ...user,
            hasWorkerDocument: workers.documents.length > 0,
            workerDocumentId: workers.documents[0]?.$id || null
          };
        }
        return user;
      })
    );

    return NextResponse.json({
      total: users.total,
      users: usersWithWorkerStatus,
      limit,
      offset,
      hasMore: users.total > (offset + limit)
    });

  } catch (error) {
    console.error('❌ List users error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to list users'
    }, { status: 500 });
  }
}
