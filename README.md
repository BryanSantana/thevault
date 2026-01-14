# the vault

a minimalist media vault for creating "drops" (albums) that can be shared by link. drops can be public or private (passcode protected). owners can upload media, view unlock counts, and manage their profile.

## features
- phone-based auth with profiles (username, display name, profile photo)
- create public or private drops
- upload photos and videos into a drop
- unlock private drops with a passcode
- shareable drop links + copy link button
- owner analytics (unlock count) and passcode visibility
- download media from a drop

## tech stack
- frontend: react + vite + typescript
- backend: node.js + express
- database: postgres on aws rds
- storage: s3 (optional local filesystem for dev)

## repository layout
- `frontend/` react client (vite)
- `backend/` express api + postgres + s3

## local setup

### prerequisites
- node 18+
- postgres (local or remote)
- aws credentials (only required if using s3)

### backend
1) install deps
```
cd backend
npm install
```

2) create `.env` (example)
```
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/thevault
JWT_SECRET=change-me
AWS_REGION=us-east-2
S3_BUCKET=thevault-media-dev
```

3) run api
```
npm run dev
```

### frontend
1) install deps
```
cd frontend
npm install
```

2) create `.env`
```
VITE_API_BASE=http://localhost:4000
```

3) run client
```
npm run dev
```

## build
frontend production build:
```
cd frontend
npm run build
```

backend production build uses a docker image (see `backend/Dockerfile`).

## deployment notes (high level)
- frontend: upload `frontend/dist` to an s3 bucket and serve via cloudfront
- backend: run the docker image (ecs or ec2) with env vars
- cloudfront: invalidate `/*` after frontend uploads to refresh cached assets

## environment variables

### backend
- `PORT` http port (default 4000)
- `DATABASE_URL` postgres connection string
- `JWT_SECRET` secret used for auth tokens
- `AWS_REGION` aws region for s3
- `S3_BUCKET` s3 bucket for media
- `MEDIA_BASE_URL` (optional) base url for local uploads

### frontend
- `VITE_API_BASE` api base url

### where we're working
- we are working at the following jira board: https://bsant.atlassian.net/jira/software/projects/SCRUM/boards/1

### where we're going
- we are using this document to write down ideas for future implementation: https://docs.google.com/document/d/1486H-gHm2YtUApjbx1whrl910H-dEyE58kLpirFf9IU/edit?tab=t.0

