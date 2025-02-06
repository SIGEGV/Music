import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.Service.js";
import { apiResponse } from "../utils/apiResponse.js";
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
  const avatarLocalPath = req.files?.avatar[0]?.path;

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

export { registerUser };
