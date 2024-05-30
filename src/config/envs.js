export const {
  PORT = 3000,
  MONGO_CONNECTION_STRING,
  TIO_MAIN_SERVER_API_URL,
  TIO_MAIN_SERVER_API_KEY,
  STATUSPAGE_API_KEY,
} = process.env;

export const ALLOWED_API_KEYS = (process.env.ALLOWED_API_KEYS || "").split(",");
