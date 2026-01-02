# JOBS Collection Setup Instructions

I've created an automated script to set up the JOBS collection in Appwrite. Follow these steps:

## Step 1: Get Appwrite Admin API Key

1. Go to your **Appwrite Console**: https://cloud.appwrite.io/console
2. Select your project
3. Click on **Settings** (left sidebar)
4. Scroll to **API Keys** section
5. Click **Create API Key**
6. Give it a name: "Jobs Collection Setup"
7. Select the following scopes:
   - `databases.write` (to create collections)
   - `collections.write` (to create attributes and indexes)
8. Click **Create**
9. **Copy the API key** (you won't be able to see it again!)

## Step 2: Add API Key to .env

Add this line to your `.env` file:

```bash
APPWRITE_API_KEY=your_admin_api_key_here
```

Replace `your_admin_api_key_here` with the API key you copied.

## Step 3: Run the Setup Script

In your terminal, run:

```bash
node scripts/setup-jobs-collection.js
```

The script will:
- ✅ Create the JOBS collection
- ✅ Add all 21 attributes (clientId, title, description, etc.)
- ✅ Create 4 indexes (clientId_index, categoryId_index, status_index, assignedWorkerId_index)
- ✅ Output the collection ID

## Step 4: Add Collection ID to .env

The script will output something like:

```
✅ JOBS collection setup completed successfully!

📋 Next steps:
1. Add this to your .env file:
   NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID=67abc1234def5678
```

Copy that line and add it to your `.env` file.

## Step 5: Restart Development Server

```bash
npm run dev
```

## Step 6: Test the Feature

1. **As Client**:
   - Login and go to `/client/dashboard`
   - Click "Post a Job"
   - Fill out the form and submit
   - Go to `/client/jobs` to see your posted job

2. **As Worker**:
   - Login and go to `/worker/dashboard`
   - Click "Browse Available Jobs"
   - Click on a job to view details
   - Click "Accept This Job"
   - Verify booking is created and payment held

---

## Manual Creation (Alternative)

If you prefer to create the collection manually in Appwrite Console, see `docs/job-posting-setup-guide.md` for detailed attribute specifications.

---

## Troubleshooting

**Error: "APPWRITE_API_KEY not found"**
- Make sure you added the API key to `.env` file
- Restart your terminal after adding the key

**Error: "Collection already exists"**
- The collection may already be created
- Check your Appwrite Console → Databases → Collections
- If it exists, just add the collection ID to your `.env` file

**Script times out or hangs**
- Appwrite Console might be slow creating attributes
- Wait a few minutes and check Appwrite Console manually
- Attributes may still be creating in the background
