import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

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
export { registerUser };
