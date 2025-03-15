# Secure Image Verification

A web application for authenticating and verifying images using RSA digital signatures and cryptographic hash functions.

## Overview

This application allows users to:

1. Register and generate a secure RSA key pair
2. Upload and sign images with their private key
3. Verify the authenticity and integrity of images

The system ensures that images haven't been tampered with and were uploaded by the rightful owner through cryptographic verification.

## Technology Stack

- **Frontend**: Next.js App Router, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (Authentication, Database, Storage)
- **Security**: Web Crypto API for RSA key generation, signing, and verification

## Security Features

- **RSA Key Pair Generation**: Each user gets a unique 2048-bit RSA key pair
- **Private Key Security**: Private keys are never sent to the server, only stored locally
- **Public Key Storage**: Public keys are stored securely in the Supabase database
- **Image Hashing**: SHA-256 hash functions ensure image integrity
- **Digital Signatures**: RSA signatures verify image authenticity

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the SQL migrations in the `supabase/migrations` folder to set up the necessary tables and security policies.

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How It Works

1. **User Registration**:
   - User creates an account with email and password
   - System generates an RSA key pair
   - Public key is stored in Supabase
   - Private key is downloaded to the user's device

2. **Image Upload**:
   - User selects an image and loads their private key
   - System creates a hash of the image
   - Hash is signed with the user's private key
   - Image and signature are stored in Supabase

3. **Image Verification**:
   - User uploads an image to verify
   - System calculates the image hash
   - Retrieves the original signature and owner's public key
   - Verifies the signature using the public key
   - Confirms if the image is authentic and unmodified

## Security Considerations

- Private keys should be kept secure by users
- The application uses client-side encryption to ensure keys never leave the user's device
- All database operations are protected by Row Level Security (RLS) policies
- Signatures ensure non-repudiation and tamper detection

## Deployment

The application can be deployed on Vercel or any platform supporting Next.js applications.

```bash
# Build for production
npm run build

# Start production server
npm start
```

## License

Boost Software License
