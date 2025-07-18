# API Documentation - Music App

Base URL: `/api/v1/`

---

## User APIs

### Register User
- **POST** `/users/register`
- **Description:** Register a new user with optional avatar upload.
- **Body:** `multipart/form-data`
  - `fullname` (string, required)
  - `email` (string, required)
  - `username` (string, required)
  - `password` (string, required)
  - `avatar` (file, optional)
- **Response:**
  - `201 Created` with user object (excluding password)
  - `400 Bad Request` for missing/invalid fields

### Verify OTP
- **POST** `/users/verify-otp`
- **Description:** Verify OTP for user registration.
- **Body:**
  - `email` (string, required)
  - `otp` (string, required)
- **Response:**
  - `200 OK` on success
  - `400/401` on failure

### Login
- **POST** `/users/login`
- **Description:** Authenticate user and issue JWT tokens.
- **Body:**
  - `email` (string, required)
  - `password` (string, required)
- **Response:**
  - `200 OK` with user object, accessToken, refreshToken
  - `400/401/404` on error

### Logout
- **POST** `/users/logout`
- **Description:** Logout user and clear tokens.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK`

### Refresh Token
- **POST** `/users/refresh-token`
- **Description:** Refresh JWT tokens.
- **Body:**
  - `refreshToken` (string, required)
- **Response:** `200 OK` with new tokens

### Get Current User
- **GET** `/users/current-user`
- **Description:** Get details of the authenticated user.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with user object

### Change Password
- **POST** `/users/change-password`
- **Description:** Change password for authenticated user.
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  - `oldPassword` (string, required)
  - `newPassword` (string, required)
- **Response:** `200 OK` on success

### Update Account
- **PATCH** `/users/update-account`
- **Description:** Update user details (fullname, email, username).
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  - `fullname` (string, optional)
  - `email` (string, optional)
  - `username` (string, optional)
- **Response:** `200 OK` with updated user object

### Update Avatar
- **PATCH** `/users/update-avatar`
- **Description:** Update user avatar.
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `multipart/form-data` with `avatar` file
- **Response:** `200 OK` with updated user object

### Get User Content
- **GET** `/users/:userId/content`
- **Description:** Get public content (profile, songs) for a user.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with user and songs

### Watch History
- **POST** `/users/watchHistory`
- **Description:** Get watch history for authenticated user.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with watch history

---

## Song APIs

### Upload Song
- **POST** `/songs/upload`
- **Description:** Upload a new song with thumbnail.
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `multipart/form-data`
  - `songFile` (file, required)
  - `thumbnail` (file, optional)
- **Response:** `200 OK` with song details

### Search Songs
- **GET** `/songs/search?q=<query>`
- **Description:** Search for songs by title.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with list of songs

### Update Song
- **PATCH** `/songs/updateSong/:songId`
- **Description:** Update song details (only by owner).
- **Headers:** `Authorization: Bearer <token>`
- **Body:** fields to update
- **Response:** `200 OK` with updated song

### Delete Song
- **DELETE** `/songs/delete/:songId`
- **Description:** Delete a song (only by owner).
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` on success

### Update Thumbnail
- **PATCH** `/songs/:songId/thumbnail`
- **Description:** Update song thumbnail (only by owner).
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `multipart/form-data` with `thumbnail` file
- **Response:** `200 OK` with updated song

### Like/Unlike Song
- **POST** `/songs/:songId/like`
- **POST** `/songs/:songId/unlike`
- **Description:** Like or unlike a song.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` on success

### Get Song & Update Views
- **POST** `/songs/:songId`
- **Description:** Get song details and increment view count.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with song details

### Homepage Songs
- **GET** `/songs/home`
- **Description:** Get songs for homepage feed.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with songs

### User Songs
- **GET** `/songs/userSongs`
- **Description:** Get all songs uploaded by authenticated user.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with songs

### Liked Songs
- **GET** `/songs/likedSongs`
- **Description:** Get all songs liked by authenticated user.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with liked songs

---

## Comment APIs

### Get Comments
- **GET** `/comments/:songId/comments`
- **Description:** Get paginated comments for a song.
- **Headers:** `Authorization: Bearer <token>`
- **Query:** `page`, `limit`
- **Response:** `200 OK` with comments and pagination

### Add Comment
- **POST** `/comments/:songId`
- **Description:** Add a comment to a song.
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  - `text` (string, required)
- **Response:** `201 Created` with comment

### Reply to Comment
- **POST** `/comments/:songId/reply/:parentId`
- **Description:** Reply to a comment.
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  - `text` (string, required)
- **Response:** `201 Created` with reply

### Like/Unlike Comment
- **POST** `/comments/:commentId/like`
- **POST** `/comments/:commentId/unlike`
- **Description:** Like or unlike a comment.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` on success

### Delete Comment
- **DELETE** `/comments/:commentId/delete`
- **Description:** Delete a comment (by owner).
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` on success

### Nuke Comment
- **DELETE** `/comments/nuke/:commentId`
- **Description:** Delete a comment (by song owner).
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` on success

### Comment Analytics
- **GET** `/comments/analytics/:songId`
- **Description:** Get sentiment analytics for comments on a song.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with analytics (total, positive, negative, neutral)

---

## Common Response Structure
All API responses are wrapped in a standard format:
```
{
  statusCode: <number>,
  data: <object|array>,
  message: <string>,
  success: <boolean>
}
```

## Error Handling
Errors are returned with appropriate HTTP status codes and a descriptive message.

---

For more details, see the source code or contact the maintainers. 
