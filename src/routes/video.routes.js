import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/")
  .get(getAllVideos) // Anyone can get videos (respects isPublished)
  .post(
    upload.fields([
      // Only logged-in users can publish
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishVideo
  );

router
  .route("/:videoId")
  .get(getVideoById) // Anyone can get a specific video (respects isPublished)
  .delete(deleteVideo) // Only owner can delete
  .patch(upload.single("thumbnail"), updateVideo); // Only owner can update (thumbnail optional)

router.route("/toggle/publish/:videoId").patch(togglePublishStatus); // Only owner can toggle publish status

export default router;
