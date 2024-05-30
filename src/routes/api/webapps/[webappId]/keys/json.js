import { RequestHandler } from "express";
import Joi from "joi";
import { getObjectPaths } from "../../../../../utils/functions";
import WebappKeysModel from "../../../../../models/WebappKeys.model";
import WordModel from "../../../../../models/Word.model";
import WebappModel from "../../../../../models/Webapp.model";
import _ from "lodash";
import LanguageModel from "../../../../../models/Language.model";
import mongoose from "mongoose";
import multer from "multer";
import { isAuth } from "../../../../../middlewares/auth.middleware";

const getWebappKeysSchema = Joi.object({
  webappId: Joi.string().required(),
});

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  res.status(200).json({ message: "Nothing to see here" });
};

const webappKeysSchema = Joi.object({
  webappId: Joi.string().required(),
});

const jsonFileSchema = Joi.object({
  mimetype: Joi.string().valid("application/json"),
}).unknown(true);

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = webappKeysSchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });

  const { value: fileValue, error: fileError } = jsonFileSchema.validate(
    req.file
  );
  if (fileError) return res.status(400).json({ message: fileError.message });

  let jsonData;
  try {
    jsonData = JSON.parse(req.file.buffer.toString());
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "KALO JSON RE PAREA" });
  }

  const webappExists = await WebappModel.findById(value.webappId);
  if (!webappExists) {
    return res.status(400).json({ message: "Webapp not found" });
  }

  const paths = getObjectPaths(jsonData);
  const language = await LanguageModel.findOne({ code: "en" });

  // Prepare data for bulkWrite
  let wordsBulkOps = paths.map((path) => {
    let wordValue = _.get(jsonData, path);
    return {
      updateOne: {
        filter: { word: wordValue, languageId: language._id },
        update: {},
        upsert: true,
      },
    };
  });

  // Execute bulkWrite for WordModel
  await WordModel.bulkWrite(wordsBulkOps);

  // Get newly updated words
  let words = await WordModel.find({ languageId: language._id });

  // Prepare data for bulkWrite
  let keysBulkOps = paths.map((path) => {
    let wordValue = _.get(jsonData, path);
    let word = words.find((w) => w.word === wordValue);
    return {
      updateOne: {
        filter: { webappId: value.webappId, jsonPath: path },
        update: { $set: { wordId: word._id } },
        upsert: true,
      },
    };
  });

  // Execute bulkWrite for WebappKeysModel
  await WebappKeysModel.bulkWrite(keysBulkOps);

  // Retrieve updated keys
  const results = await WebappKeysModel.find({ webappId: value.webappId })
    .populate("wordId")
    .then((res) =>
      res.map((doc) => {
        const { wordId, ...rest } = doc.toJSON();
        return {
          wordId: wordId._id,
          word: wordId,
          ...rest,
        };
      })
    );

  res.status(200).json(results);
};

const upload = multer({ storage: multer.memoryStorage() });
/**
 * @type {import("../../interfaces/types").IEndpointsConfig}
 */
export default {
  middleware: {
    all: [isAuth, upload.single("lang_en")],
  },
};
