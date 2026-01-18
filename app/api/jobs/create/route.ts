import { NextRequest, NextResponse } from 'next/server';
import { JobPostingService } from '@/lib/job-posting.service';
const { serverDatabases } = require('@/lib/appwrite-server');

/**
 * POST /api/jobs/create
 *
 * Client creates a new job posting
 * This endpoint uses server SDK to properly set document permissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, jobData } = body;

    // Validate required fields
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Client ID is required' },
        { status: 400 }
      );
    }

    if (!jobData) {
      return NextResponse.json(
        { success: false, message: 'Job data is required' },
        { status: 400 }
      );
    }

    // Validate required job fields
    const requiredFields = ['title', 'description', 'categoryId', 'locationAddress', 'scheduledDate', 'budgetMax'];
    const missingFields = requiredFields.filter(field => !jobData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Create job using server SDK (has API key authority for permissions)
    const job = await JobPostingService.createJob(clientId, jobData, serverDatabases);

    return NextResponse.json({
      success: true,
      message: 'Job posted successfully',
      job
    });

  } catch (error: any) {
    console.error('Error creating job:', error);

    // Handle specific Appwrite errors
    if (error.code === 401) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in again.' },
        { status: 401 }
      );
    }

    if (error.code === 400) {
      return NextResponse.json(
        { success: false, message: error.message || 'Invalid job data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create job posting' },
      { status: 500 }
    );
  }
}
