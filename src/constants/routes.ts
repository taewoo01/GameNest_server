export const ROUTES = {
  AUTH: {
    BASE: "/auth",
    FIND_ID: "/find-id",
    FIND_PW: "/find-password",
    REGISTER: "/register",
    LOGIN: "/login",
    USER: "/auth/me",
    UPDATE: "/update",
    UPDATE_PW: "/change-password"
  },
  GAME: {
    BASE: "/game",
    LIST: "/list",
    DETAIL: "/:id/detail", 
    LIKE: "/:id/like",
    RATING: "/:id/rating",
    LIKED_LIST: "/likes",
    CATEGORY: "/category/:type/:value",
  },
  COMMUNITY: {
    BASE: "/community",
    LIST: "/",
    DETAIL_COMMU: '/:id',
    ACTION_COMMU: '/:id/action',
    WRITE: "/write",
    MY_POSTS: "/my-posts",
  }
};
