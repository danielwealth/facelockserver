Backend – FaceLock Server
Overview

The backend is a Node.js/Express service that handles:

    Presigned S3 upload URLs

    Document & selfie verification jobs

    Rate limiting and security middleware

    Status polling for verification results

    Getting Started
Prerequisites

    Node.js (v18+ recommended)

    npm or yarn

    AWS S3 bucket configured

    Environment variables set

    INSTALLATION:
    git clone <repo-url>
cd backend

Environment Variables
PORT=4000
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=your_region
S3_BUCKET=your_bucket
VERIFY_API_KEY=your_verification_provider_key

Running Locally
npm run dev

Key Endpoints
Endpoint	Method	Description
/upload-url	POST	Get presigned S3 upload URL
/verify/document	POST	Start verification job
/verify/document/status/:jobId	GET	Poll job status
Create a .env file with:npm install

Rate Limiting

    Configured in middleware/rateLimiter.js

    Defaults: 60 requests/min per user, 120/min per IP

    Adjust values to balance UX and server safety


