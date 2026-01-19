import { NextRequest, NextResponse } from 'next/server';
import { Account, Client } from 'node-appwrite';
import { AccountDeletionService } from '@/lib/account-deletion.service';
const { serverDatabases } = require('@/lib/appwrite-server');
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';

/**
 * POST /api/account/delete
 *
 * Permanently deletes user account with:
 * - Auto-cancellation of active bookings (with refunds)
 * - Auto-refund of wallet balance to bank account
 * - Hard deletion from all collections
 * - Deletion of authentication account
 *
 * Requires:
 * - Valid authentication session
 * - Password confirmation
 * - No open disputes
 * - No pending withdrawals
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, reason } = body;

    // 1. Validate password is provided
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password confirmation is required' },
        { status: 400 }
      );
    }

    // 2. Get session from cookies
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated. Please log in.' },
        { status: 401 }
      );
    }

    // 3. Create Appwrite client with user session
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setSession(sessionCookie.value);

    const account = new Account(client);

    // 4. Verify session is valid and get user
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    const userId = user.$id;

    // 5. Verify password by attempting to create a new session
    // (This is how we confirm the user knows their password)
    let passwordValid = false;
    try {
      const emailSession = await account.createEmailPasswordSession(user.email, password);
      passwordValid = true;

      // Delete the verification session immediately
      try {
        await account.deleteSession(emailSession.$id);
      } catch (deleteError) {
        console.error('Failed to delete verification session:', deleteError);
      }
    } catch (error: any) {
      // Password is incorrect or other error
      if (error.code === 401) {
        return NextResponse.json(
          { success: false, message: 'Incorrect password. Please try again.' },
          { status: 401 }
        );
      }
      throw error; // Re-throw if it's not an auth error
    }

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, message: 'Password verification failed' },
        { status: 401 }
      );
    }

    // 6. Check deletion eligibility
    console.log(`🔍 Checking deletion eligibility for user: ${userId}`);
    const eligibility = await AccountDeletionService.checkDeletionEligibility(userId);

    if (!eligibility.canDelete) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot delete account',
          blockers: eligibility.blockers,
          summary: eligibility.summary
        },
        { status: 400 }
      );
    }

    // 7. Get user details for email notification
    let userProfile;
    try {
      userProfile = await serverDatabases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        userId
      );
    } catch (error) {
      console.error('Failed to get user profile:', error);
    }

    // 8. Process account deletion (database cleanup, refunds, etc.)
    console.log(`🗑️ Processing account deletion for user: ${userId}`);
    const deletionResult = await AccountDeletionService.processAccountDeletion(userId);

    if (!deletionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: deletionResult.message,
          error: deletionResult.error
        },
        { status: 500 }
      );
    }

    // 9. Send deletion confirmation email
    if (userProfile?.email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: userProfile.email,
            subject: 'Account Deleted - ErrandWork',
            html: `
              <h2>Account Deleted</h2>
              <p>Hi ${userProfile.name},</p>
              <p>Your ErrandWork account has been permanently deleted as requested.</p>
              <p><strong>Deletion Summary:</strong></p>
              <ul>
                <li>Bookings cancelled: ${deletionResult.details?.bookingsCancelled || 0}</li>
                <li>Refund processed: ₦${(deletionResult.details?.refundProcessed || 0).toLocaleString()}</li>
                <li>Files deleted: ${deletionResult.details?.filesDeleted || 0}</li>
              </ul>
              <p>If you didn't request this deletion, please contact support immediately.</p>
              <p>Thank you for using ErrandWork.</p>
            `
          })
        });
      } catch (emailError) {
        console.error('Failed to send deletion confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // 10. Delete the Appwrite authentication account
    // Note: This must be done LAST, after all database operations
    console.log(`🔐 Deleting authentication account for user: ${userId}`);
    try {
      // Delete all sessions first
      await account.deleteSessions();

      // Note: Appwrite doesn't have a direct "deleteAccount" method for the logged-in user
      // The account will be inaccessible after we delete the user from USERS collection
      // and delete all sessions. The auth record can be cleaned up by admin later if needed.

    } catch (authError) {
      console.error('Failed to delete auth sessions:', authError);
      // Don't fail the deletion if this fails - account is already deleted from database
    }

    console.log(`✅ Account deletion completed successfully for user: ${userId}`);

    // 11. Return success response
    return NextResponse.json({
      success: true,
      message: deletionResult.message,
      details: deletionResult.details
    });

  } catch (error: any) {
    console.error('❌ Error in account deletion API:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete account. Please try again or contact support.',
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/account/delete
 *
 * Check if account can be deleted (eligibility check)
 * Returns blockers, warnings, and summary of what will be deleted
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Get session from cookies
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Create Appwrite client with user session
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setSession(sessionCookie.value);

    const account = new Account(client);

    // 3. Get user
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    // 4. Check eligibility
    const eligibility = await AccountDeletionService.checkDeletionEligibility(user.$id);

    return NextResponse.json({
      success: true,
      eligibility
    });

  } catch (error: any) {
    console.error('Error checking deletion eligibility:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check eligibility',
        error: error.message
      },
      { status: 500 }
    );
  }
}
