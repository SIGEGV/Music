import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.Service.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { Song } from "../models/song.model.js";
import { Otp } from "../models/otp.model.js";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";
import tempUserStorage from "../utils/tempUserStorage.js";
import { sendOtp } from "../utils/mailService.js";

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
  tempUserStorage[email] = { fullname, username, password, avatarPath };
  const generateOtp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const hashedOtp = await bcrypt.hash(generateOtp, 10);
  await Otp.deleteMany({ email });
  const otpCreated = await Otp.create({ email: email, otp: hashedOtp });
  if (!otpCreated) {
    throw new apiError(
      500,
      "Failed to store OTP in the database. Please try again."
    );
  }
  const sent = await sendOtp(email, generateOtp);
  if (!sent) {
    throw new apiError(500, "Unable to sent the otp. Please Try Again Later");
  }
  const options = {
    httpOnly: true,
    secure: true,
    maxAge: 5 * 60 * 1000,
  };
  return res
    .status(200)
    .cookie("emailForOTP", email, options)
    .json(
      new apiResponse(200, "OTP sent Succesfully.Redirecting to verification.")
    );
});

const verifyUserOtpAndRegister = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const email = req.cookies.emailForOTP;
  if ([otp].some((fields) => fields?.trim() === "")) {
    throw new apiError(400, "Enter Otp");
  }
  const otpRecord = await Otp.findOne({ email });
  if (!otpRecord) {
    throw new apiError(400, "OTP expired or invalid");
  }
  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  if (!isMatch) {
    throw new apiError(400, "Invalid OTP");
  }
  await Otp.deleteOne({ email });
  const userDetails = tempUserStorage[email];
  if (!userDetails) {
    throw new apiError(400, "Session expired. Please re-register.");
  }
  const { fullname, username, password, avatarPath } = userDetails;

  const user = await User.create({
    fullname,
    email,
    username,
    password,
    avatar: avatarPath.url,
  });
  delete tempUserStorage[email];
  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!userCreated) {
    throw new apiError(500, "Something went wrong while registering the User");
  }
  res.clearCookie("emailForOTP");
  return res
    .status(200)
    .json(new apiResponse(200, "User Registered Succesfully"));
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

  if (username && email) {
    const emailUser = await User.findOne({ email });
    if (!emailUser || emailUser.username !== username) {
      throw new apiError(
        400,
        "Username and Email do not belong to the same account"
      );
    }
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
          { newAccessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Refresh Token ");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  /* 
      Steps: 
        1-> take oldPassword newPassword and confirmPassword from req;
        2-> take user from req as it is logged in ; 
        3->  check if old password is correct or not
        4->if correct save the new password
        -> update the password
  */

  const { oldPassword, newPassword, confirmPassword } = req.body;
  console.log(oldPassword, newPassword, confirmPassword);
  const user = req.user; // got user in req as if a user can change its
  // password it means it is loggedin and auth middleware insert user in req

  try {
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new apiError(400, "Incorrect oldPassord");
    }
    if (newPassword !== confirmPassword) {
      throw new apiError(400, "New Password and Confirm Password are not same");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new apiResponse(200, {}, "Password Updated"));
  } catch (error) {
    throw new apiError(400, error?.message || "Unauthorized Access");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select("-password");
  // console.log(req.user?.username);
  return res
    .status(200)
    .json(new apiResponse(200, user, "Current User Fetched Succesfully "));
});

const updateUserDetail = asyncHandler(async (req, res) => {
  try {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
      throw new apiError(400, "Both FullName and Email are required");
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullname: fullname,
          email: email,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { user: user },
          "Account Detail Updated Succesfully"
        )
      );
  } catch (error) {
    throw new apiError(
      500,
      error?.message ||
        "Failed to update account details. Please try again later."
    );
  }
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new apiError(500, "Error While Updating Avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, { user: user }, "Avatar Updated Succesfully"));
});

const getUserContent = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new apiError(400, "Invalid User ID format");
    }

    const user = await User.findById(userId).select("username fullName avatar");
    if (!user) {
      throw new apiError(404, "User not found");
    }

    const songs = await Song.find({ owner: userId });

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { user, songs },
          "User content fetched successfully"
        )
      );
  } catch (error) {
    throw new apiError(500, "Something went wrong while fetching user content");
  }
});

export {
  registerUser,
  loginUser,
  loggedoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetail,
  updateAvatar,
  getUserContent,
  verifyUserOtpAndRegister,
};
