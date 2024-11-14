import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// Secured Routes
router.route("/logOut").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshToken);

router.route("/change-current-password").post(verifyJWT, changeCurrentPassword);

router.route("/get-current-user").post(verifyJWT, getCurrentUser);

router.route("/update-account-details").post(verifyJWT, updateAccountDetails);

router
  .route("/update-avatar")
  .post(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/update-cover-image")
  .post(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;
