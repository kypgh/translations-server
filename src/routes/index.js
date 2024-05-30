import { RequestHandler } from "express";

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  res.status(200).json({ message: "server is running" });
};
