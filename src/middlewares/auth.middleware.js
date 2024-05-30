import {
  TIO_MAIN_SERVER_API_KEY,
  TIO_MAIN_SERVER_API_URL,
} from "../config/envs";
import axios from "axios";

/**
 *
 * @type {import("express").RequestHandler}
 */
export const isAuth = async (req, res, next) => {
  if (!req.headers["authorization"]) {
    return res.status(401).json({ message: "Unauthorized", code: 1 });
  }

  try {
    const response = await axios.get(
      `${TIO_MAIN_SERVER_API_URL}/dashboard/auth/isAuth`,
      {
        headers: {
          authorization: req.headers["authorization"],
          "x-api-key": TIO_MAIN_SERVER_API_KEY,
        },
      }
    );
    req.crmUser = response.data;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized", code: 1 });
  }
};

/**
 *
 * @type {(string | string[]) => import("express").RequestHandler}
 */
export const hasApiKey = (key) => async (req, res, next) => {
  if (!req.headers["x-api-key"]) {
    return res.status(401).json({ message: "Unauthorized", code: 1 });
  }
  if (!Array.isArray(key)) key = [key];
  if (!key.includes(req.headers["x-api-key"])) {
    return res.status(401).json({ message: "Unauthorized", code: 1 });
  }

  return next();
};
