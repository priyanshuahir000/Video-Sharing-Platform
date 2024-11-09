import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true, // this will automatically trim the whitespaces from the username
    index: true, // this will be used to search the user by username
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  avatar: {
    type: String, // Cloudinary URL
    required: true,
  },
  coverImage: {
    type: String, // Cloudinary URL
    required: true,
  },
  watchHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
  ],
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  refreshToken: {
    type: String,
  },
}, 
{
    timestamps: true,
}
);

export const User = mongoose.model("User", userSchema);

// in mongodb the table will be name as users ( in plural form) and the schema will be userSchema
// it is the mongodb convention to name the table in plural form and lowercase of the model name
