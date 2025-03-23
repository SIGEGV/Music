import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { Song } from "../models/song.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.Service.js";
import * as mm from "music-metadata";
import fs from "fs";
import { apiResponse } from "../utils/apiResponse.js";

const uploadAudio = asyncHandler(async (req, res) => {
  /*
          STEPS FOR UPLOADING FILES
          1. check if all the required fields are provided or not
          2. check if Audio file is give if true upload it
          3. check same for thumbnail. 
          4. get duration and user id(from req as user is logged in)
          4. not upload all the entries to the db.
  */
  const { title, description } = req.body;
  if ([title, description].some((fields) => fields?.trim() === "")) {
    throw new apiError(400, "All Fields are Required");
  }
  const audioFileLocalPath = req.files?.songFile?.[0]?.path;
  if (!audioFileLocalPath) {
    throw new apiError(400, "Audio File is Required");
  }
  const audioMetaData = await mm.parseFile(audioFileLocalPath);
  const duration = Math.round(audioMetaData?.format.duration);

  const audioPath = await uploadOnCloudinary(audioFileLocalPath, "audio");
  if (!audioPath) {
    throw new apiError(500, "Failed to upload Audio file. Try Again");
  }

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalPath) {
    throw new apiError(400, "Thumbnail File is Required");
  }
  const thumbnailPath = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailPath) {
    throw new apiError(500, "Failed to upload Thumbnail. Try Again");
  }

  const userId = req.user._id;
  const song = await Song.create({
    songFile: audioPath.url,
    thumbnail: thumbnailPath.url,
    title: title,
    description: description,
    duration: duration,
    owner: userId,
  });
  const songUploaded = await Song.findById(song._id);
  if (!songUploaded) {
    throw new apiError(500, "Something Went Wrong While Uploading the Song");
  }
  return res
    .status(200)
    .json(new apiResponse(200, songUploaded, "songUploadedSuccesfully"));
});

export { uploadAudio };
