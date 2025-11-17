<!--
  Title: Music Streaming Platform - Technical Documentation
  Audience: Engineering leads, senior developers, DevOps
-->

# Music Streaming Platform – Technical Documentation

## 1. Project Overview

### 1.1 High-Level Description
Music is a full-stack audio streaming platform inspired by Spotify. The backend (this repository) provides RESTful APIs for user onboarding, OTP-based verification, secure authentication, media upload/streaming, engagement (likes, comments, playlists), analytics, and admin tooling. Media assets are stored on Cloudinary, transactional state lives in MongoDB, and Redis is leveraged for low-latency engagement counters that are later flushed to MongoDB through background cron jobs.

### 1.2 Purpose & Goals
- Allow independent artists to upload tracks (audio + thumbnails) with minimal friction.
- Provide listeners an authenticated experience with personalized feeds, history, and engagement.
- Offer social interactions (likes, comments, replies) with sentiment analytics that can drive moderation.
- Maintain scalability by offloading hot counters to Redis, using cron jobs for eventual consistency.
- Ship production-friendly artifacts (Docker/Docker Compose) so the stack can be deployed on any container runtime.

### 1.3 Core Problem Solved
The platform facilitates self-service music publishing and consumption with built-in community engagement and analytics. It abstracts away media hosting, access control, OTP-based onboarding, token lifecycle, and caching concerns so teams can focus on UI/UX and growth.

### 1.4 Tech Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | Any SPA/mobile client (not part of this repo); consumes `/api/v1` REST APIs | Expects CORS origin list defined in `src/constants.js`. |
| Backend | Node.js 18, Express 4 | Structured controllers, middleware, routes under `src/`. |
| Database | MongoDB | Models for users, songs, comments, playlists, OTP, likes; uses aggregate paginate plugin. |
| Cache/Queue | Redis 7 | Tracks like sets (`song:{id}:likedBy`, `comment:{id}:likedBy`) and can hold other ephemeral state. |
| Storage | Cloudinary | Stores avatars, thumbnails, audio files; audio uploaded as `resource_type: video`. |
| Background Jobs | node-cron + p-limit | Flushes Redis counters to MongoDB every minute. |
| Messaging | Nodemailer (Gmail SMTP) | Sends OTP emails. |
| Containerization | Docker, Docker Compose | Single service plus Redis; hot reload via bind mount. |

---

## 2. System Architecture

### 2.1 High-Level Diagram
```
           ┌────────────────────────────────────────┐
           │            Client Apps (Web/Mobile)    │
           └────────────────────────────────────────┘
                             │ HTTPS / CORS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express API Gateway (Node.js)                 │
│  - Routes: /api/v1/users, /songs, /comments, /playlist          │
│  - Middleware: CORS, auth (JWT), multer, rate limiter           │
│  - Services: OTP, Cloudinary uploads, analytics                 │
│  - Background cron workers (node-cron)                          │
└─────────────────────────────────────────────────────────────────┘
      │                │                  │                 │
      │                │                  │                 │
      ▼                ▼                  ▼                 ▼
┌────────────┐  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐
│  MongoDB   │  │    Redis     │  │  Cloudinary    │  │ Gmail SMTP/NM  │
│  (Atlas/   │  │  (Self/Cloud)│  │  (Media CDN)   │  │ (OTP delivery) │
│  Replica)  │  │              │  │                │  │                │
└────────────┘  └──────────────┘  └────────────────┘  └────────────────┘
```

### 2.2 Backend Architecture
- **Entry point**: `src/index.js` loads env vars, connects Redis (`connectRedis`), then MongoDB (`connectDB`), and finally boots the Express app defined in `src/app.js`.
- **Config**: `src/constants.js` centralizes shared constants (ports, CORS, env file path).
- **Middleware stack**:
  - `cors` with environment-aware origins (`LOCAL_DEVELOPEMENT_ORIGINS` vs `process.env.CORS_ORIGIN`).
  - `express.json` / `express.urlencoded` limited to `16kb`.
  - `cookie-parser` for reading JWT cookies.
  - Static hosting via `public/`.
  - Route-specific middleware: `verifyJWT`, `isSongOwner`, `isPlaylistOwner`, `multer upload`, `otpVerifyLimiter`.
- **Routing**: Versioned routers (`src/routes/v1/*`) mount under `/api/v1`.
- **Controllers**: Organized per domain (`user`, `song`, `comment`, `playlist`) with async handlers, all returning `apiResponse`.
- **Utilities**: OTP mailer, Cloudinary service, API response/error wrappers, Redis client, temporary in-memory store for pre-verified users.
- **Background jobs**: Node-cron scripts (`syncLikesToDB.js`, `syncCommentsLikesToDB.js`) imported once in `index.js`. They scan Redis keys every minute, batch them (size = 1000) and fan out processing using `p-limit` for concurrency control.

### 2.3 Frontend Architecture
- Not part of this repo, but clients are expected to:
  - Store `accessToken` in HTTP-only cookies (server also returns tokens in JSON for mobile).
  - Send `Authorization: Bearer <token>` for protected routes.
  - Handle OTP registration flow (two-step register + verify).
  - Upload multipart forms for avatars, songs, thumbnails, playlist covers via presigned forms (multer expects `songFile`, `thumbnail`, `avatar` field names).
  - Render analytics/dashboards by calling `comments/analytics`, `songs/home`, `songs/likedSongs`, `users/watchHistory`.

### 2.4 Component Communication
1. **HTTP Client → Express**: All interactions start as REST requests.
2. **Express → MongoDB**: CRUD via Mongoose models; transactions for cascading deletes (e.g., `SONG_SCHEMA.pre('deleteOne')`).
3. **Express → Cloudinary**: On avatar/song/thumbnail upload via `uploadOnCloudinary`.
4. **Express → Redis**: For like/unlike operations the service reads/writes Redis sets. Keys follow `song:<songId>:likedBy` and `comment:<commentId>:likedBy`.
5. **Express → Nodemailer (Gmail SMTP)**: Sends OTP emails with `sendOtp`.
6. **Cron Workers → Redis/MongoDB**: Periodically consume Redis keys, persist counts, and delete the keys to avoid duplication.

### 2.5 Authentication & Authorization Flow
- **OTP**: `POST /api/v1/users/register` stores user data in `tempUserStorage`, hashes OTP in `OTP` collection, and sends email. Cookie `emailForOTP` (secure, httpOnly) keeps context. `POST /verify-otp` compares user input with hashed OTP, persists final user, clears cookie.
- **JWT**: `loginUser` issues access + refresh tokens, stores refresh token in DB, sets both cookies (`Options` enforce httpOnly, env-aware `secure`, `sameSite`). Access token payload includes `_id, email, username, fullname`.
- **Refresh Flow**: `POST /refresh-token` verifies DB-backed refresh token and rotates both tokens.
- **Protected Routes**: `verifyJWT` middleware extracts token from cookie/header, verifies signature, attaches `req.user`.
- **Ownership Guards**: `isSongOwner`, `isPlaylistOwner` restrict modifications to resource owners.
- **Logout**: Clears DB refresh token and both cookies.

### 2.6 Cloudinary Usage
- Audio uploads call `uploadOnCloudinary(..., FILE_DETAIL.AUDIO)` which maps to Cloudinary `resource_type=video`.
- Thumbnails and avatars default to `resource_type=image`.
- Local temp files (stored in `public/temp`) are deleted post-upload to minimize disk usage.
- Cloudinary credentials come from `process.env`.

### 2.7 Redis Caching
- Maintains *set* of user IDs per song/comment for likes:
  - Song likes key: `song:<songId>:likedBy`
  - Comment likes key: `comment:<commentId>:likedBy`
- On first like/unlike after cold start, the service hydrates the Redis set from MongoDB to maintain accuracy.
- Redis URL configured via `process.env.REDIS_DOCKER_URL`.
- Future caches (e.g., trending songs, OTP throttling) can reuse the same client.

### 2.8 Cron Jobs for Batch Writes
- `syncLikesToDB.js`: Every minute, fetches `song:*:likedBy` keys, processes them in batches of 1,000 keys, concurrency limit 5. For each key, writes the user set into the `Like` collection, updates `Song.likeCount`, deletes the Redis key.
- `syncCommentsLikesToDB.js`: Same cadence for `comment:*:likedBy`. Updates `Comments_Like`, recalculates `Comments.likeCount`, and recalculates `Song.commentCount`.
- Both scripts rely on `p-limit` to avoid overwhelming MongoDB and log outcomes for observability.

### 2.9 Deployment Pipeline
- **Dockerfile** builds a Node 18 image, installs npm dependencies, and runs `npm run dev`.
- **docker-compose.yml** orchestrates `backend` + `redis` services. Backend mount allows live-editing; depends_on ensures Redis availability.
- Environment: `.env` mounted via `env_file`. Additional services (MongoDB Atlas, Cloudinary, SMTP) are external dependencies configured via env variables.
- For CI/CD, integrate Docker build/push steps and run migrations/scripts from `SCRIPTS/`.

---

## 3. Project Flow

### 3.1 Registration & OTP Verification
Steps:
1. Client calls `POST /api/v1/users/register` with `multipart/form-data` (avatar + credentials).
2. Server validates uniqueness, uploads avatar to Cloudinary, stores interim data in `tempUserStorage[email]`.
3. OTP generated (6 digits), hashed, stored in `OTP` collection (TTL 5 minutes) and emailed via Nodemailer.
4. Server sets `emailForOTP` cookie (httpOnly, secure, 5 min).
5. Client submits `POST /api/v1/users/verify-otp` with OTP.
6. Server compares hashed OTP, creates user record, deletes temp storage + cookie.

ASCII Sequence:
```
Client -> API (/register) -> Cloudinary (avatar)
Client <- OTP Sent ----------------------------------
Client -> API (/verify-otp, cookie=emailForOTP)
API -> MongoDB (persist user)
API -> Client (201 Created)
```

### 3.2 Login & Token Lifecycle
1. `POST /api/v1/users/login` with email/password.
2. Server validates credentials (bcrypt compare).
3. Generates access & refresh JWTs, stores refresh token on user doc.
4. Sets cookies + returns tokens in JSON for mobile clients.
5. Protected routes require `verifyJWT`; refresh via `POST /api/v1/users/refresh-token`.

Sequence Diagram:
```
Client -> API (/login)
API -> MongoDB (fetch user, bcrypt)
API -> JWT Service (sign access, refresh)
API -> Client (cookies + body)
Client -> API (/protected) with access cookie
API -> verifyJWT -> MongoDB (user lookup)
```

### 3.3 Protected Routes
- All protected endpoints include `verifyJWT`. Owner-specific operations add `isSongOwner` or `isPlaylistOwner`.
- Rate-limited OTP verification uses `otpVerifyLimiter`.

### 3.4 Uploading Songs
1. `POST /api/v1/songs/upload` with `songFile` + `thumbnail`.
2. Multer stores temp files under `public/temp`.
3. `music-metadata` extracts duration.
4. Audio + thumbnail uploaded to Cloudinary.
5. MongoDB `Song` document created (owner = `req.user._id`, metadata, genre).

Request/Response Flow:
```
Client -> API (multipart form)
API -> Multer (disk storage)
API -> Cloudinary (audio, image)
API -> MongoDB (Song.create)
API -> Client (song payload, owner details)
```

### 3.5 Interaction with Songs (Likes, Comments, Views)
- **Views** (`POST /songs/:id`): increments view counter if user hasn’t viewed within last 30 mins, records in watch history, keeps only last month.
- **Likes** (`POST /songs/:id/like`): ensures Redis set exists, adds user ID, updates `UserLikedSongs`, background job syncs to MongoDB.
- **Comments**:
  - `POST /comments/:songId` creates comment with sentiment score and `isFlagged`.
  - `POST /comments/:songId/reply/:parentId` for nested replies.
  - `POST /comments/:commentId/like` uses Redis set similar to songs.

### 3.6 Analytics
- `GET /api/v1/comments/analytics/:songId`: counts positive/negative/neutral comments using `sentimentScore`.
- `GET /analytics/:songId` (alias in requirements) returns total likes, comments, plays; built by combining `Song` metrics and comment data.

### 3.7 End-to-End Controller/Service/Repository Flow
```
Route (/songs/:id/like)
  -> Middleware: verifyJWT
  -> Controller: likeSong
       - Validate song
       - Redis hydration
       - Update UserLikedSongs (Mongo)
       - API response
  -> Cron Worker flushes Redis -> LIKE collection + Song.likeCount
```

---

## 4. Features

- **Authentication System**
  - JWT-based sessions with refresh rotation.
  - Cookies configured with `httpOnly`, `sameSite`, `secure` toggled by env.
  - Access tokens for API calls, refresh tokens stored in DB.

- **OTP System**
  - OTP generation via `otp-generator`.
  - Store hashed OTPs in MongoDB with TTL index (5 minutes).
  - Rate limiting on `/verify-otp`.
  - Email delivery through Nodemailer Gmail SMTP.

- **Song Upload & Streaming**
  - Multer handles file uploads, `music-metadata` extracts duration.
  - Cloudinary hosts audio & thumbnails; clients stream from Cloudinary URLs.

- **Song Streaming/Views Tracking**
  - Views restricted to once per 30 minutes per user.
  - Watch history persisted per user, trimmed to last month.

- **Likes & Comments**
  - Redis-backed like sets for songs/comments with cron-based flushing.
  - Sentiment analysis on comments to flag toxic content.
  - Nested comments (replies) with recursion for deletion.

- **Analytics**
  - Comment sentiment breakdown.
  - Song metrics (views, likes, commentCount) updated automatically.

- **Dashboard-ready APIs**
  - `/songs/home` for paginated latest content with owner info.
  - `/songs/userSongs`, `/songs/likedSongs`, `/users/watchHistory`.

- **Pagination**
  - `aggregatePaginate` on songs, manual pagination on comments.

- **Cloudinary Media Management**
  - Single service file for uploads, automatic local cleanup.
  - Distinguishes audio vs image uploads.

- **Redis Caching**
  - Central client with error logging.
  - Key hydration to avoid data loss after restarts.

- **Cron Jobs**
  - Node-cron tasks flush likes, update derived counts, maintain data integrity.

- **Additional Utilities**
  - `tempUserStorage` for bridging register → OTP verification.
  - `apiResponse`/`apiError` for consistent API contracts.
  - Ownership guard middleware for songs/playlist modifications.

---

## 5. Detailed API Documentation

> Base URL: `/api/v1`

### 5.1 User Auth APIs (`/users`)

#### POST `/users/register`
- **Purpose**: Start registration, upload avatar, send OTP.
- **Headers**: `Content-Type: multipart/form-data`
- **Body**:
  ```json
  {
    "fullname": "Jane Doe",
    "email": "jane@example.com",
    "username": "janedoe",
    "password": "Str0ngPass!"
  }
  ```
  `avatar` file required.
- **Validation**: Non-empty strings, unique email/username, avatar present.
- **Responses**:
  - `200 OK` `{ statusCode, message: "OTP sent...", success: true }`
  - `400/409` with `apiError`.
- **Side Effects**: Upload avatar (Cloudinary), store OTP (Mongo), set cookie `emailForOTP`.

#### POST `/users/verify-otp`
- **Headers**: `Cookie: emailForOTP=<email>`
- **Body**: `{ "otp": "123456" }`
- **Validation**: OTP present, matches hashed value, not expired.
- **Success**: Registers user, clears cookie, returns `USER_REGISTERED`.
- **Errors**: `400` for missing/expired OTP, `500` if creation fails.
- **DB Ops**: Read OTP, create `User`, delete OTP doc.

#### POST `/users/login`
- **Body**: `{ "email": "jane@example.com", "password": "Str0ngPass!" }`
- **Success**: Sets cookies `accessToken`, `refreshToken`; returns user (sans password) plus tokens.
- **Errors**: `404` user not found, `401` invalid password.

#### POST `/users/logout`
- **Auth**: `verifyJWT`
- **Action**: Removes refresh token, clears cookies.

#### POST `/users/refresh-token`
- **Body (optional)**: `{ "refreshToken": "<token>" }`
- **Cookie**: `refreshToken`
- **Validation**: Refresh token exists, matches DB, signature valid.
- **Response**: New access + refresh tokens (cookies + body).

### 5.2 Song APIs (`/songs`)

#### POST `/songs/upload`
- **Auth**: `verifyJWT`
- **Body**: `multipart/form-data` (fields `songFile`, `thumbnail`, `title`, `description`, optional `Genre`)
- **Validation**: Files present, text fields non-empty.
- **Success**: Returns populated song object.
- **Errors**: `400` missing data, `500` Cloudinary failure.
- **External**: Cloudinary uploads, `music-metadata`.

#### POST `/songs/:id`
- **Purpose**: Fetch song, increment views (with 30-min throttle), update watch history.
- **Responses**:
  - `200` with `{ views }` message `SONG_VIEW_COUNTED`.
  - `200` with `SONG_VIEW_NOT_COUNTED` if throttled.
- **DB Ops**: Update `Song.views`, `viewedBy`, `User.watchHistory`.

#### POST `/songs/:id/like`
- **Action**: Add user to Redis set, upsert `UserLikedSongs`.
- **Redis**: `sAdd song:<id>:likedBy`
- **DB**: `UserLikedSongs` collection.
- **Response**: `200`, message `SONG_LIKED`.

#### POST `/songs/:id/unlike`
- **Action**: `sRem` in Redis, `$pull` from `UserLikedSongs`.
- **Response**: `200`, `SONG_UNLIKED`.

#### GET `/songs/home`
- **Purpose**: Paginated feed (default page=1, limit=5) sorted by newest.
- **Implementation**: `aggregatePaginate` with `$lookup` to user.

#### GET `/songs/userSongs`
- **Purpose**: Return user’s songs, embed owner username.

#### GET `/songs/likedSongs`
- **Purpose**: Return documents from `UserLikedSongs` with nested owner info.

#### GET `/songs/search?q=...`
- **Purpose**: Fuzzy search across songs, users, playlists.
- **Validation**: Query param required.

#### PATCH `/songs/updateSong/:songId`
- **Auth**: `verifyJWT`, `isSongOwner`
- **Body**: Partial song fields.
- **Response**: Updated song.

#### DELETE `/songs/delete`
- **Auth**: `verifyJWT`, `isSongOwner`
- **Body**: `{ "songId": "<id>" }`
- **Cascades**: Song pre-delete middleware removes comments, likes, watch history.

#### PATCH `/songs/:songId/thumbnail`
- **Auth**: `verifyJWT`, `isSongOwner`
- **Body**: `thumbnail` file.

### 5.3 Analytics APIs

#### GET `/comments/analytics/:songId`
- **Auth**: `verifyJWT`, `isSongOwner`
- **Response**:
  ```json
  {
    "Payload": {
      "Total": 25,
      "Positive": 14,
      "Negative": 6,
      "Neutral": 5
    }
  }
  ```
- **Notes**: Validates `songId`, counts using `sentimentScore`.

#### GET `/analytics/:songId` (to implement/extend)
- Should aggregate `Song.likeCount`, `Song.commentCount`, `Song.views`, plus comment sentiment.
- Current building block = comment analytics + song doc; expose via future endpoint.

### 5.4 Comment APIs (`/comments`)

| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/comments/:songId/comments` | GET | Paginated nested comments | Query: `page`, `limit`. |
| `/comments/:songId` | POST | Add comment | Sentiment scoring, flagged. |
| `/comments/:songId/reply/:parentId` | POST | Reply to comment | Requires valid parent. |
| `/comments/:commentId/like` | POST | Like comment | Redis set + cron flush. |
| `/comments/:commentId/unlike` | POST | Unlike comment | Redis removal. |
| `/comments/:commentId/delete` | DELETE | Delete comment + replies | Recursively collects IDs. |
| `/comments/nuke/:commentId` | DELETE | Owner-level delete | Uses `isSongOwner`. |

Validation & Responses follow `apiResponse` / `apiError`.

### 5.5 Playlist APIs (`/playlist`)

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/playlist/` | POST | verifyJWT | Create playlist (optional thumbnail upload). |
| `/playlist/get` | GET | verifyJWT | Fetch user’s playlists (populated). |
| `/playlist/:playlistId/addSongs` | POST | verifyJWT + isPlaylistOwner | Add song (uses `$addToSet`). |
| `/playlist/:playlistId/removeSong/:songId` | DELETE | verifyJWT + isPlaylistOwner | Remove song. |
| `/playlist/:playlistId/update` | POST | verifyJWT + isPlaylistOwner | Update metadata, thumbnail. |
| `/playlist/get/:playlistId` | GET | verifyJWT | Fetch public playlist by id. |
| `/playlist/getPublicPlaylist` | GET | verifyJWT | All public playlists. |
| `/playlist/delete` | DELETE | verifyJWT + isPlaylistOwner | Delete playlist. |

Request bodies include playlist/song IDs (validated as ObjectId). Responses wrap playlist objects.

### 5.6 Admin APIs
- Currently admin-only flows piggyback on ownership middleware (e.g., `isSongOwner` to nuke comments, `isPlaylistOwner` to manage playlists). Dedicated admin endpoints can be added later to moderate flagged comments or manage users.

---

## 6. Database Schema Documentation

### 6.1 Collections & Fields

1. **User (`User`)**
   - `_id` ObjectId (index)
   - `username` String (unique, indexed)
   - `email` String (unique, lowercase)
   - `fullname` String (indexed)
   - `avatar` String (Cloudinary URL)
   - `watchHistory` [{ `song`: ObjectId ref Song, `watchedAt`: Date }]
   - `password` String (bcrypt hashed)
   - `refreshToken` String

2. **UserLikedSongs (`USER_LIKED_SONGS`)**
   - `userId` ObjectId (unique, ref User)
   - `likedSongs` [ObjectId ref Song]

3. **Song (`Song`)**
   - `songFile`, `thumbnail` String
   - `title`, `description`, `genre`
   - `duration` Number (seconds)
   - `views`, `commentCount`, `likeCount`
   - `owner` ObjectId ref User
   - `viewedBy` [{ `userId`, `lastViewed` }]
   - Plugin: `mongoose-aggregate-paginate-v2`
   - Pre-delete hook cascades to comments, likes, user watch history.

4. **Like (`Like`)**
   - `songId` ObjectId
   - `userId` [ObjectId]

5. **Comments (`Comments`)**
   - `content` String (<=1000 chars)
   - `song` ObjectId ref Song
   - `user` ObjectId ref User
   - `parentComment` ObjectId ref Comments
   - `isFlagged` Boolean
   - `sentimentScore` Number
   - `likeCount` Number

6. **Comments_Like (`Comments_Like`)**
   - `commentId` ObjectId ref Comments
   - `userId` [ObjectId]

7. **Playlist (`PLAYLIST`)**
   - `playlist_name` String
   - `description` String
   - `isPublic` Boolean
   - `owner` ObjectId ref User
   - `songs` [ObjectId ref Song]
   - `thumbnail` String

8. **OTP (`Otp`)**
   - `email` String
   - `otp` String (bcrypt hash)
   - `createdAt` Date (TTL 300 seconds)

### 6.2 Indexing Strategy
- Mongo automatically indexes `_id`.
- Explicit unique indexes on `username`, `email`, `userId` (liked songs).
- TTL index on `OTP.createdAt`.
- Consider compound indexes for queries: `Song.owner`, `Comment.song`, `Playlist.owner`.

### 6.3 Relationships
```
User 1 ── * Song
User 1 ── * Playlist
Song 1 ── * Comment ── * Replies
Song 1 ── * Like.userId
Comment 1 ── * Comments_Like.userId
User 1 ── * UserLikedSongs (likedSongs)
```

### 6.4 Example Documents

```
{
  "_id": "65f...",
  "username": "janedoe",
  "email": "jane@example.com",
  "fullname": "Jane Doe",
  "avatar": "https://res.cloudinary.com/.../avatar.jpg",
  "watchHistory": [
    { "song": "65f...", "watchedAt": "2025-11-16T12:33:15.123Z" }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 7. Error Handling

- **Custom Class**: `apiError` extends `Error`, captures stack trace, sets `statusCode`, `message`, `success=false`, `errors=[]`.
- **Standard Format**:
  ```json
  {
    "statusCode": 400,
    "data": null,
    "message": "Required fields are missing.",
    "success": false,
    "errors": []
  }
  ```
- **Success Wrapper**: `apiResponse` with `statusCode`, `data`, `message`, `success = statusCode < 400`.
- **HTTP Mapping**: Consistent use of `STATUS_CODE`/`STATUS_CODES` constants (200, 400, 401, 403, 404, 409, 500).
- **Validation Errors**: Throw `apiError` with `BAD_REQUEST`. OTP rate limiting returns 429 via middleware.
- **Global Handling**: Express error middleware (not shown) should convert thrown `apiError` to responses; for non-apiError, respond with 500 + default message.

---

## 8. Security Considerations

- **Password Encryption**: `USER_SCHEMA.pre('save')` hashes passwords with bcrypt (salt=10).
- **Token Security**:
  - Access tokens signed with `ACCESS_TOKEN_SECRET` + expiry.
  - Refresh tokens stored per user; mismatch triggers unauthorized error.
- **Cookie Flags**:
  - `httpOnly` always true.
  - `secure` toggles by `NODE_ENV`.
  - `sameSite` strict in production, lax in dev.
- **Preventing Unauthorized Access**:
  - `verifyJWT` guard on all protected routes.
  - Ownership middleware for destructive actions.
  - Rate limiting OTP verification.
  - Input validation plus ObjectId checks.
- **Rate Limiting**: `otpVerifyLimiter` (max 5 attempts / 15 min).
- **Sanitization**: Multer filters file extensions; content trimmed before storage; sentinel checks on IDs.
- **Cloudinary Security**: Credentials stored in env, local files deleted post-upload to avoid leakage.
- **Email/OTP**: OTP hashed before storage, expires automatically via TTL.

---

## 9. Future Improvements

- **Performance**:
  - Resolve cron bug (`Promise.all` typo) to ensure concurrency works.
  - Batch view/watch history writes or move to Redis to reduce DB churn.
  - Add caching for homepage feed and trending analytics.

- **Scalability**:
  - Introduce message queues (e.g., BullMQ) for heavy jobs (transcoding, email).
  - Use Redis Cluster / AWS ElastiCache for HA.
  - Add read replicas for MongoDB to offload analytics queries.

- **Observability**:
  - Add structured logging (pino/winston) and metrics.
  - Track cron job stats and Redis key counts.

- **Security Enhancements**:
  - Integrate rate limiting on login/like/comment routes.
  - Add CSRF protection for cookie-based clients.
  - Implement account lockout / MFA.

- **Feature Roadmap**:
  - Admin moderation dashboard for flagged comments.
  - Enhanced analytics endpoint combining plays, likes, sentiment over time.
  - Support collaborative playlists, playlist followers.
  - Streaming optimizations (HLS conversion, pre-signed URLs).

---

### Appendix
- **Docker Commands**:
  - `docker-compose up --build` to start backend + Redis.
  - `npm run dev` for local development (requires MongoDB & Redis running).
- **Environment Variables** (sample):
  - `PORT`, `NODE_ENV`, `CORS_ORIGIN`
  - `MONGODB_URI`, `DB_NAME`
  - `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`
  - `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `SMTP_EMAIL`, `SMTP_PASSWORD`
  - `REDIS_DOCKER_URL`


