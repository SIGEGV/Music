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

const searchSong = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim() === "") {
    throw new apiError(400, "Enter the song name");
  }
  const songs = await Song.find({
    title: { $regex: query, $options: "i" },
  }).populate("owner", "username fullname  avatar");
  if (!songs.length) {
    throw new apiError(404, "No songs found matching your search");
  }
  return res
    .status(200)
    .json(new apiResponse(200, songs, "Songs fetched successfully"));
});

const updateSongDetail = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { title, desciption } = req.body;
  if (!title && !desciption) {
    throw new apiError(400, "Enter either of the field to update");
  }

  const updatedSong = await Song.findByIdAndUpdate(
    songId,
    { $set: req.body },
    { new: true }
  );
  if (!updatedSong) {
    throw new apiError(404, "Song not found");
  }
  return res
    .status(200)
    .json(new apiResponse(200, updatedSong, "Updated the Song Detail"));
});

const deleteSong = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const deletedSong = await Song.findByIdAndDelete(songId);

  if (!deletedSong) {
    throw new apiError(404, "Song does not exist");
  }

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Song Deleted Successfully"));
});

const updateThumbnail = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const localThumbnailPath = req.files?.thumbnail?.[0]?.path;
  if (!localThumbnailPath) {
    throw new apiError(400, "Upload The Thumbnail");
  }
  const thumbnailPath = await uploadOnCloudinary(localThumbnailPath);
  if (!thumbnailPath) {
    throw new apiError(500, "Failed to upload Thumbnail. Try Again");
  }
  const updatedSong = await Song.findByIdAndUpdate(
    songId,
    { $set: { thumbnail: thumbnailPath.url } },
    { new: true }
  );
  if (!updatedSong) {
    throw new apiError(404, "Song Does not Exist");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, { updatedSong }, "Thumbnail Updated Succesfully")
    );
});
export {
  uploadAudio,
  searchSong,
  updateSongDetail,
  deleteSong,
  updateThumbnail,
};
