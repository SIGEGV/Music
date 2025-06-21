import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserContent,
  getWatchHistory,
  loggedoutUser,
  refreshAccessToken,
  registerUser,
  updateAvatar,
  updateUserDetail,
  verifyUserOtpAndRegister,
  loginUser,
} from "../../controllers/v1/user.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { otpVerifyLimiter } from "../../middlewares/rateLimiter.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/verify-otp").post(otpVerifyLimiter, verifyUserOtpAndRegister);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, loggedoutUser);
router.route("/watchHistory").post(verifyJWT, getWatchHistory);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/update-account").patch(verifyJWT, updateUserDetail);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/:userId/content").get(verifyJWT, getUserContent);

export default router;
