import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

/**
 * @description Establishes a connection to the MongoDB database using Mongoose.
 * This function connects to the MongoDB server using the URI stored in the environment variables
 * and the database name defined in the constants file. If the connection is successful,
 * it logs the host of the MongoDB connection. If the connection fails, it logs the error
 * and terminates the process.
 * @async
 * @function connectDB
 * @returns {void}
 * @throws {Error} Throws an error and exits the process if the MongoDB connection fails.
 */
const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(`MongoDB Connected!!! DB_HOST: ${connection.connection.host}`);
  } catch (error) {
    console.log(`MongoDB Connection Failed`, error);
    process.exit(1);
  }
};

export default connectDB;
