# AI system design

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ruikangwnemos-projects/v0-ai-system-design)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/QHA0PQtEAEV)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/ruikangwnemos-projects/v0-ai-system-design](https://vercel.com/ruikangwnemos-projects/v0-ai-system-design)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/QHA0PQtEAEV](https://v0.app/chat/projects/QHA0PQtEAEV)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Docker deployment

To run the application outside of Vercel you can build and run the Docker image that ships with this repository.

1. Build the production image (pass your Supabase credentials so they are available at build time):

   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
     -t illegal-dumping-control .
   ```

2. Start the container and forward port `3000`:

   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
     illegal-dumping-control
   ```

   The site will be available at <http://localhost:3000>.

Both the build and runtime steps require the Supabase environment variables that power the application. If you need to supply additional values, pass them as `--build-arg` flags during `docker build` and repeat them with `-e` when running the container.