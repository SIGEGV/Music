const DB_NAME = "Spots";
const DEFAULT_PORT = 8000;
const TRAFIC_LIMIT = "16kb";
const STATIC_FOLDER = "public";
const PRODUCTION = "P";
const PATH = "./env";
const CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const CORS_ALLOWED_HEADERS = ["Content-Type", "Authorization"];
const LOCAL_DEVELOPEMENT_ORIGINS = ["http://localhost:8081"];
export {
  DB_NAME,
  DEFAULT_PORT,
  TRAFIC_LIMIT,
  STATIC_FOLDER,
  PATH,
  CORS_METHODS,
  CORS_ALLOWED_HEADERS,
  PRODUCTION,
  LOCAL_DEVELOPEMENT_ORIGINS,
};
