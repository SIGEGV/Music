const USER_FIELDS = {
  ID: "_id",
  USERNAME: "username",
  EMAIL: "email",
  FULLNAME: "fullname",
  AVATAR: "avatar",
  WATCH_HISTORY: "watchHistory",
  WATCH_HISTORY_SONG: "watchHistory.song",
  WATCH_HISTORY_WATCHED_AT: "watchHistory.watchedAt",
  PASSWORD: "password",
  REFRESH_TOKEN: "refreshToken",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
};
const SONG_FIELDS = {
  ID: "_id",
  SONG_FILE: "songFile",
  THUMBNAIL: "thumbnail",
  TITLE: "title",
  DESCRIPTION: "description",
  DURATION: "duration",
  VIEWS: "views",
  COMMENT_COUNT: "commentCount",
  LIKE_COUNT: "likeCount",
  LIKE: "like",
  OWNER: "owner",
  VIEWED_BY: "viewedBy",
  VIEWED_BY_USER_ID: "viewedBy.userId",
  VIEWED_BY_LAST_VIEWED: "viewedBy.lastViewed",
  CREATED_AT: "createdAt",
};

const PLAYLIST_FIELDS = {
  ID: "_id",
  PLAYLIST_NAME: "playlist_name",
  DESCRIPTION: "description",
  IS_PUBLIC: "isPublic",
  OWNER: "owner",
  SONGS: "songs",
  THUMBNAIL: "thumbnail",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
};
const LIKED_HISTORY = {
  LIKED_SONGS: "likedSongs",
  USER_ID: "userId",
};
const PLAYLIST = {
  ID: "_id",
  PLAYLIST_NAME: "playlist_name",
  DESCRIPTIONS: "description",
  IS_PUBLIC: "isPublic",
  OWNER: "owner",
  THUMBNAIL: "thumbnail",
  SONGS: "songs",
};
const SCHEMA_NAMES = {
  COMMENTS: "Comments",
  COMMENTS_LIKE: "Comments_Like",
  SONG: "Song",
  USER: "User",
  LIKE: "Like",
  OTP: "Otp",
  TEMP_USER: "TempUser",
  LIKED_HISTORY: "USER_LIKED_SONGS",
  PLAYLIST: "PLAYLIST",
};

export {
  USER_FIELDS,
  SONG_FIELDS,
  SCHEMA_NAMES,
  LIKED_HISTORY,
  PLAYLIST,
  PLAYLIST_FIELDS,
};
