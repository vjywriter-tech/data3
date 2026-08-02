# Student Document Upload Portal — Vercel + Cloudflare R2

This is the Vercel-ready version of the Criterion 4.7.2 student evidence
portal. It contains 30 fixed student-event entries and stores uploaded PDF,
JPG, and PNG evidence in your own private Cloudflare R2 bucket.

## How uploads work

1. The browser asks the Vercel API route for a short-lived upload URL.
2. The API validates the fixed entry, file type, and declared size.
3. The browser uploads the file directly to Cloudflare R2.
4. The upload URL expires after five minutes.

Direct browser-to-R2 uploads keep the 10 MB file limit without sending the
file through a Vercel Function.

Files use this private R2 object-key structure:

```text
criterion-4.7.2/<ENTRY_ID>/evidence
```

Uploading again to the same entry replaces its previous evidence.

## 1. Create the R2 bucket

1. Sign in to the Cloudflare dashboard.
2. Open **R2 Object Storage**.
3. Select **Create bucket**.
4. Use a name such as `student-evidence`.
5. Keep the bucket private. Do not enable public bucket access.

## 2. Create restricted R2 credentials

1. On the R2 overview page, find **Account Details**.
2. Select **Manage** next to **API Tokens**.
3. Create an Account API token.
4. Select **Object Read & Write** permission.
5. Restrict the token to only the student-evidence bucket.
6. Copy and securely save:
   - Access Key ID
   - Secret Access Key
7. Copy your Cloudflare Account ID from the R2 overview page.

The Secret Access Key is shown only once. Never put these credentials in
frontend code or commit them to Git.

Official guide:
https://developers.cloudflare.com/r2/api/tokens/

## 3. Install and run locally

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in:

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=student-evidence
```

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Upload the project to GitHub

Create a new empty GitHub repository, then run these commands from this project
folder:

```bash
git init
git add .
git commit -m "Initial Vercel student upload portal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Do not commit `.env.local`.

## 5. Import it into Vercel

1. Sign in to https://vercel.com/.
2. Select **Add New → Project**.
3. Import the GitHub repository.
4. Vercel should detect **Next.js** automatically.
5. Keep the default build command: `next build`.
6. Before deploying, add the four environment variables from the next section.

Official guide:
https://vercel.com/docs/git

## 6. Add environment variables in Vercel

Open the Vercel project and go to:

**Settings → Environment Variables**

Add:

| Variable | Value |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 token Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 token Secret Access Key |
| `R2_BUCKET_NAME` | Your R2 bucket name |

Enable each variable for Production. Also enable Preview and Development if
you need uploads from those deployments.

Deploy the project. Vercel will give you a URL such as:

```text
https://your-project.vercel.app
```

Official guide:
https://vercel.com/docs/environment-variables

## 7. Configure R2 CORS

Direct browser uploads require your bucket to allow `PUT` requests from the
exact Vercel origin.

1. Open Cloudflare **R2 Object Storage**.
2. Select your bucket.
3. Open **Settings**.
4. Under **CORS Policy**, select **Add CORS policy**.
5. Copy `r2-cors.example.json`.
6. Replace `https://YOUR-PROJECT.vercel.app` with your actual Vercel URL.
7. Save.

Example:

```json
[
  {
    "AllowedOrigins": [
      "https://your-project.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The origin must not have a trailing slash. If you later connect a custom
domain, add that exact origin to `AllowedOrigins`.

Official guide:
https://developers.cloudflare.com/r2/buckets/cors/

## 8. Verify the live portal

1. Open the Vercel production URL.
2. Search for a student.
3. Upload a small test PDF, JPG, or PNG.
4. Confirm the row changes to **Uploaded**.
5. Open the R2 bucket and confirm this object exists:

```text
criterion-4.7.2/<ENTRY_ID>/evidence
```

## Security notes

- The R2 bucket remains private.
- R2 credentials are used only in server-side API routes.
- The browser receives a URL that permits one `PUT` operation for one object
  and expires after five minutes.
- There is no public download route.
- There is no student login. Anyone who has the site link can currently upload
  or replace evidence for any fixed entry.
- For stronger submission control, add enrollment-number verification, OTP,
  Turnstile, or a one-time upload lock.

## Common problems

### “R2 storage is not configured”

One or more Vercel environment variables are missing. Add all four variables
and redeploy.

### “R2 rejected the upload”

The R2 CORS policy does not contain the exact Vercel origin, `PUT`, or
`Content-Type`.

### Status loads but upload fails

Status checking is server-to-server and does not need CORS. Direct browser
uploads do need CORS, so verify the bucket policy.

### A custom domain was added

Add `https://yourdomain.com` to `AllowedOrigins`. Do not include a path or
trailing slash.
"# data" 
