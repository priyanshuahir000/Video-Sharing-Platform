import mongoose, { Schema } from "mongoose";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //Cloudinary URL
      required: true,
    },
    thumbnail: {
      type: String, //Cloudinary URL
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number, // cloudnary url
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.type.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);


export const Video = mongoose.model("Video", videoSchema);
// in mongodb the table will be name as videos ( in plural form) and the schema will be videoSchema
