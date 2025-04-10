const USER_FIELDS = {
  USERNAME: "username",
  EMAIL: "email",
  FULLNAME: "fullname",
  AVATAR: "avatar",
  WATCH_HISTORY: "watchHistory",
  WATCH_HISTORY_SONG: "watchHistory.song",
  WATCH_HISTORY_WATCHED_AT: "watchHistory.watchedAt",
  PASSWORD: "password",
  REFRESH_TOKEN: "refreshToken",
};
const SONG_FIELDS = {
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
};
const SCHEMA_NAMES = {
  COMMENTS: "Comments",
  SONG: "Song",
  USER: "User",
  LIKE: "Like",
  OTP: "Otp",
};

export { USER_FIELDS, SONG_FIELDS, SCHEMA_NAMES };
