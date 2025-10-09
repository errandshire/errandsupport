# Reviews Collection Setup Guide

## Overview
You need to create the `REVIEWS` collection in your Appwrite database to support the review system.

## Step 1: Create the Collection

1. Go to your Appwrite Console
2. Navigate to your project
3. Go to **Database** → **Collections**
4. Click **Create Collection**
5. Set the collection ID to match your environment variable: `NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID`

## Step 2: Add Attributes

Create the following attributes in the `REVIEWS` collection:

### Required Attributes

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| `bookingId` | String | 255 | Yes | No | - |
| `clientId` | String | 255 | Yes | No | - |
| `workerId` | String | 255 | Yes | No | - |
| `rating` | Integer | - | Yes | No | - |
| `comment` | String | 1000 | No | No | - |
| `isPublic` | Boolean | - | Yes | No | true |
| `createdAt` | String | 255 | Yes | No | - |
| `updatedAt` | String | 255 | Yes | No | - |

### Optional Attributes

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| `response` | String | 1000 | No | No | - |
| `responseCreatedAt` | String | 255 | No | No | - |

## Step 3: Set Permissions

### Read Permissions
- **Any**: For public reviews (when `isPublic` is true)
- **Users**: For private reviews

### Create Permissions
- **Users**: Only authenticated users can create reviews

### Update Permissions
- **Users**: Only the review creator can update their review
- **Workers**: Workers can add responses to reviews

### Delete Permissions
- **Users**: Only the review creator can delete their review
- **Admins**: Admins can delete any review

## Step 4: Create Indexes

Create the following indexes for better performance:

### Index 1: Worker Reviews
- **Key**: `workerId`
- **Type**: Key
- **Attributes**: `workerId`

### Index 2: Client Reviews
- **Key**: `clientId`
- **Type**: Key
- **Attributes**: `clientId`

### Index 3: Booking Reviews
- **Key**: `bookingId`
- **Type**: Key
- **Attributes**: `bookingId`

### Index 4: Public Reviews
- **Key**: `isPublic`
- **Type**: Key
- **Attributes**: `isPublic`

### Index 5: Rating Index
- **Key**: `rating`
- **Type**: Key
- **Attributes**: `rating`

### Index 6: Created Date
- **Key**: `createdAt`
- **Type**: Key
- **Attributes**: `createdAt`

## Step 5: Update Environment Variables

Make sure your `.env.local` file has the correct collection ID:

```env
NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID=your_reviews_collection_id_here
```

## Step 6: Test the Collection

After creating the collection, test it by:

1. Running your application
2. Going to the worker reviews page
3. Verifying that reviews load without errors

## Data Structure Example

Here's an example of what a review document should look like:

```json
{
  "$id": "review_123",
  "bookingId": "booking_456",
  "clientId": "client_789",
  "workerId": "worker_101",
  "rating": 5,
  "comment": "Excellent service! Very professional and punctual.",
  "isPublic": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "response": "Thank you for the kind words!",
  "responseCreatedAt": "2024-01-15T11:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **404 Collection Not Found**: Make sure the collection ID in your environment variables matches the actual collection ID in Appwrite.

2. **Permission Denied**: Check that the permissions are set correctly for the collection.

3. **Attribute Errors**: Ensure all required attributes are created with the correct types and sizes.

4. **Index Errors**: Make sure all indexes are created properly for optimal performance.

### Validation Rules

- `rating` must be between 1 and 5
- `comment` is optional but limited to 1000 characters
- `isPublic` defaults to true for public reviews
- `bookingId`, `clientId`, and `workerId` are required and must reference existing documents
