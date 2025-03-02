import { Router } from "express";
import {
  loggedoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { loginUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
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

router.route("/login").post(loginUser);

//secureRoutes
router.route("/logout").post(verifyJWT, loggedoutUser);
router.route("/refresh-token").post(refreshAccessToken);
export default router;
