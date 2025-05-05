import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  // TODO: Implement pagination, sorting, filtering based on query params
  // For now, fetch all videos

  const pipeline = [];

  // Match videos by user ID if provided
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new apiError(400, "Invalid userId");
    }
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // Match videos based on search query (title or description)
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    });
  }

  // Only match published videos unless the user is the owner
  if (!userId || req.user?._id.toString() !== userId) {
    pipeline.push({ $match: { isPublished: true } });
  }

  // Sorting
  const sortCriteria = {};
  if (sortBy && sortType) {
    sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;
    pipeline.push({ $sort: sortCriteria });
  } else {
    // Default sort by creation date
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // Add owner details
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails", // Unwind to embed owner details directly
    }
  );

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videoAggregate = Video.aggregate(pipeline);
  const videos = await Video.aggregatePaginate(videoAggregate, options);

  if (!videos || videos.docs.length === 0) {
    return res.status(200).json(new apiResponse(200, [], "No videos found"));
  }

  return res
    .status(200)
    .json(new apiResponse(200, videos, "Videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new apiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new apiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new apiError(400, "Thumbnail file is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new apiError(500, "Failed to upload video file to Cloudinary");
  }
  if (!thumbnail) {
    throw new apiError(500, "Failed to upload thumbnail to Cloudinary");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration, // Assuming Cloudinary provides duration
    owner: req.user._id,
    isPublished: true, // Default to published, can be changed later
  });

  if (!video) {
    throw new apiError(500, "Failed to save video details to database");
  }

  return res
    .status(201)
    .json(new apiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (
    !video ||
    (!video.isPublished && video.owner.toString() !== req.user?._id.toString())
  ) {
    throw new apiError(404, "Video not found or not published");
  }

  // Increment views and add to watch history
  const user = await User.findById(req.user?._id);
  if (user) {
    // Add to watch history only if not already present (or handle duplicates as needed)
    if (!user.watchHistory.includes(videoId)) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { watchHistory: videoId },
      });
    }
  }

  // Increment view count - consider doing this more robustly to avoid race conditions or multiple increments per session
  await Video.findByIdAndUpdate(videoId, {
    $inc: { views: 1 },
  });

  // Fetch video again to get updated view count (or add view count to the initial fetch)
  const updatedVideo = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        // Example: Add likes count
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
        likesCount: {
          $size: "$likes",
        },
        // Example: Check if current user liked the video
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        // Clean up fields
        ownerDetails: 0,
        likes: 0, // Don't send the full likes array unless needed
      },
    },
  ]);

  if (!updatedVideo?.length) {
    throw new apiError(404, "Video not found after update");
  }

  return res
    .status(200)
    .json(new apiResponse(200, updatedVideo[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path; // Assuming thumbnail update uses single file upload

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video ID");
  }

  if (!title && !description && !thumbnailLocalPath) {
    throw new apiError(
      400,
      "At least one field (title, description, thumbnail) must be provided for update"
    );
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video not found");
  }

  // Check if the requesting user is the owner
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, "You are not authorized to update this video");
  }

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail?.url) {
      throw new apiError(500, "Failed to upload new thumbnail");
    }
    updateData.thumbnail = thumbnail.url;
    // TODO: Delete old thumbnail from Cloudinary
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true } // Return the updated document
  );

  if (!updatedVideo) {
    throw new apiError(500, "Failed to update video details");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video not found");
  }

  // Check if the requesting user is the owner
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, "You are not authorized to delete this video");
  }

  // TODO: Delete video file and thumbnail from Cloudinary
  // const videoFileUrl = video.videoFile;
  // const thumbnailFileUrl = video.thumbnail;
  // await deleteFromCloudinary(videoFileUrl, 'video'); // Need a utility function for this
  // await deleteFromCloudinary(thumbnailFileUrl, 'image');

  const result = await Video.findByIdAndDelete(videoId);

  if (!result) {
    throw new apiError(500, "Failed to delete video from database");
  }

  // TODO: Remove video from watch history of all users (optional, could be heavy)
  // TODO: Remove video from all playlists
  // TODO: Delete associated likes and comments

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video not found");
  }

  // Check if the requesting user is the owner
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new apiError(
      403,
      "You are not authorized to change the publish status of this video"
    );
  }

  // Toggle the status
  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isPublished: video.isPublished },
        "Video publish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
