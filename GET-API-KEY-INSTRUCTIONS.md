# How to Get Your Appwrite Admin API Key

## Step-by-Step Instructions:

1. **Open Appwrite Console**
   - Go to: https://cloud.appwrite.io/console
   - Login to your account

2. **Select Your Project**
   - You should see your project ID: `686d2332000c59689987`
   - Click on it

3. **Navigate to Settings**
   - Look in the left sidebar
   - Click on **Settings** (gear icon)

4. **Find API Keys Section**
   - Scroll down to the **API Keys** section
   - Click **Create API Key** button

5. **Configure the API Key**
   - **Name**: Jobs Collection Setup
   - **Expiration**: Never (or set to 1 day if you want it to expire after setup)
   - **Scopes**: Select these permissions:
     - ✅ `databases.read`
     - ✅ `databases.write`
     - ✅ `collections.read`
     - ✅ `collections.write`
     - ✅ `attributes.read`
     - ✅ `attributes.write`
     - ✅ `indexes.read`
     - ✅ `indexes.write`

6. **Create and Copy**
   - Click **Create**
   - **IMPORTANT**: Copy the API key immediately (you won't see it again!)
   - It will look like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

7. **Add to .env File**
   - Open your `.env` file
   - Find line 32: `APPWRITE_API_KEY=your_api_key`
   - Replace with: `APPWRITE_API_KEY=<paste_your_key_here>`
   - Save the file

8. **Run the Setup Script**
   ```bash
   node scripts/setup-jobs-collection.js
   ```

9. **Add Collection ID to .env**
   - The script will output something like:
     ```
     NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID=67abc1234def5678
     ```
   - Copy that line and add it to your `.env` file

10. **Restart Dev Server**
    ```bash
    npm run dev
    ```

---

## Alternative: Manual Creation in Console

If you prefer not to use the script, you can create the collection manually:

1. Go to: https://cloud.appwrite.io/console
2. Select your project
3. Go to **Databases** → Click on your database (ID: `686d236c0019a5b41e26`)
4. Click **Create Collection**
5. Name: `jobs`
6. Add all 21 attributes as specified in `docs/job-posting-setup-guide.md`
7. Create 4 indexes
8. Copy the collection ID to `.env`

**Manual creation will take about 15-20 minutes.**
**Script will take about 30 seconds.**

---

Once you have the API key, let me know and I can guide you through the rest!
