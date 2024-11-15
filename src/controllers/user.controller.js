import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(500, `Token generation failed + ${error.message}`);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 1. Extract user details from the request body
  // 2. Validate the user details (e.g., check if email is valid, password is strong enough)
  // 3. Check if the user already exists in the database
  // 4. Check for images, check for avatar
  // 5. Upload them to cloudinary
  // 6. Create user object - create entry in db
  // 7. remove password and resfreshToken from the response
  // 8. check for user creation
  // 9. Send a response back to the client with the created user's details (excluding the password)

  const { email, password, fullName, username } = req.body;

  if (
    [fullName, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (!existedUser) {
    throw new apiError(
      409,
      "User with the same email or username already exists!"
    );
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, `Avatar file is required! ( Local Path Error )`);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar file is required! ( Cloudinary Error )");
  }
  let user;
  try {
    user = await User.create({
      email,
      password,
      fullName,
      username,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });
  } catch (error) {
    throw new apiError(500, `User creation failed [ 1 ] + ${error.message}`);
  }

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "User creation failed [ 2 ]");
  }

  res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // 1. Extract user details from the request body
  // 2. Check if the user already exists in the database
  // 3. Check if the password is correct
  // 4. Generate a JWT Access Token and a Refresh Token
  // 5. Send a response back to the client with the generated token

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new apiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User not found");
  }

  const isPasswordValid = await user.isCorrectPassword(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const cookieOption = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. Clear the refresh token from the user's document in the database
  // 2. Send a response back to the client with a message that the user has been logged out

  const user = req.user; // user is available from the verifyJWT middleware

  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      new: true,
    }
  );

  const cookieOption = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOption)
    .clearCookie("refreshToken", cookieOption)
    .json(new apiResponse(200, {}, "User logged out successfully!"));
});

const refreshToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      throw new apiError(401, "refresh token is required");
    }

    console.log("incomingRefreshToken", incomingRefreshToken);

    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedRefreshToken._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new apiError(401, "Invalid refresh token");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const cookieOption = {
      httpOnly: true,
      secure: true,
    };

    console.log("newRefreshToken", newRefreshToken);
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOption)
      .cookie("refreshToken", newRefreshToken, cookieOption)
      .json(
        new apiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Token refreshed successfully!"
        )
      );
  } catch (error) {
    throw new apiError(401, error.message);
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // 1. Extract user details from the request body
  // 2. Check if the user already exists in the database
  // 3. Check if the password is correct
  // 4. Generate a JWT Access Token and a Refresh Token
  // 5. Send a response back to the client with the generated token

  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new apiError(404, "User not found");
  }

  const isPasswordValid = await user.isCorrectPassword(oldPassword);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid credentials");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const cookieOption = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new apiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Password changed successfully!"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new apiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new apiResponse(200, user, "User details fetched successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, username, email } = req.body;

  if (!fullName && !username && !email) {
    throw new apiError(400, "No data to update");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullName || req.user.fullName,
        username: username || req.user.username,
        email: email || req.user.email,
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new apiError(500, "User details update failed");
  }

  return res
    .status(200)
    .json(new apiResponse(200, user, "User details updated successfully!"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, `Avatar file is required! ( Local Path Error )`);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar file is required! ( Cloudinary Error )");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new apiError(500, "User avatar update failed");
  }

  return res
    .status(200)
    .json(new apiResponse(200, user, "User avatar updated successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(
      400,
      `Cover Image file is required! ( Local Path Error )`
    );
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new apiError(
      400,
      "Cover Image file is required! ( Cloudinary Error )"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new apiError(500, "User cover image update failed");
  }

  return res
    .status(200)
    .json(new apiResponse(200, user, "User cover image updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.lowercase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new apiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "Channel profile fetched successfully!")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
