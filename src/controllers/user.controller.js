import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.Service.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      error.message ||
        "Something Went Wrong While generating Refresh and Access Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /*
    STEPS FOR REGISTRATION 
    
  // get details from client   done
  // validation- details not empty   done 
  //checking if already existed or not: using email and username  done 
  //check for images , for avatar and upload it to cloudinary
  //create user object 
  //remove password and refresh token field from response
  //check for user creation 
  //return res
*/

  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new apiError(400, "All Fields are Required");
  }
  const userExist = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExist) {
    throw new apiError(409, "Username or Email Already Existed");
  }
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is Required");
  }

  const avatarPath = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarPath) {
    throw new apiError(400, "Avatar file is Required");
  }

  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatarPath.url,
  });

  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!userCreated) {
    throw new apiError(500, "Something went wrong while registering the User");
  }

  return res
    .status(201)
    .json(new apiResponse(200, userCreated, "User Succesfully created"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
     STEPS FOR LOGIN
       1-> input from user and store it on variable
       2-> check if all fields are there i.e username , email and password if not return Enter all the Fields
       2-> check if email exist or not if not-> return this email doesnt exist
       3-> if exist check for password if not match return wrong password
       4-> if password is correct then give him accessToken and refreshToken 
       5-> send Cookies
       6-> logg in 
*/

  const { username, email, password } = req.body;
  if (!(username || email || password)) {
    throw new apiError(400, "Enter All the  Fields ");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "Username or Email Does'nt Exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(401, "Password is not correct");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // for Mobile Apps
        },
        "User Succesfuly Logged In"
      )
    );
});

const loggedoutUser = asyncHandler(async (req, res) => {
  const user = req.user._id;
  await User.findByIdAndUpdate(
    // Removing Refresh token form db
    user,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new apiError(401, "Invalid Refresh Token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new apiError(401, "Refresh Token is Expired or Used ");
    }

    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { newAccessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Refresh Token ");
  }
});
export { registerUser, loginUser, loggedoutUser, refreshAccessToken };
