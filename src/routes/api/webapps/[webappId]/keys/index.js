import { RequestHandler } from "express";
import Joi from "joi";
import { getObjectPaths } from "../../../../../utils/functions";
import WebappKeysModel from "../../../../../models/WebappKeys.model";
import WordModel from "../../../../../models/Word.model";
import WebappModel from "../../../../../models/Webapp.model";
import _ from "lodash";
import LanguageModel from "../../../../../models/Language.model";
import mongoose from "mongoose";
import { isAuth } from "../../../../../middlewares/auth.middleware";

const getWebappKeysSchema = Joi.object({
  webappId: Joi.string().required(),
  lang: Joi.string().default("en"),
});

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  const { value, error } = getWebappKeysSchema.validate(req.query);

  if (error) return res.status(400).json({ message: error.message });

  try {
    const { lang = "en" } = req.query;
    const language = await LanguageModel.findOne({ code: lang });
    if (!language) {
      return res.status(400).json({ message: "Language not found" });
    }

    const webappExists = await WebappModel.findById(value.webappId);
    if (!webappExists) {
      return res.status(400).json({ message: "Webapp not found" });
    }

    //prettier-ignore
    const aggr = [
      { $match: { webappId: new mongoose.Types.ObjectId(value.webappId) } },
      { $lookup: { from: "words", localField: "wordId", foreignField: "_id", as: "enWord", }, },
      { $unwind: "$enWord" },
    ];
    if (lang !== "en") {
      //prettier-ignore
      aggr.push({ $lookup: { from: "words", localField: "wordId", foreignField: "englishWordId", pipeline: [{ $match: { languageId: language._id } }], as: "word", }, },)

      aggr.push({
        $unwind: {
          path: "$word",
          preserveNullAndEmptyArrays: true,
        },
      });
    }

    const keys = await WebappKeysModel.aggregate(aggr);
    const constructedObj = {};

    keys.forEach(async (key) => {
      _.set(constructedObj, key.jsonPath, key?.word?.word || key?.enWord?.word);
    });

    return res.status(200).json(constructedObj);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const webappKeysSchema = Joi.object({
  webappId: Joi.string().required(),
  jsonPath: Joi.object().required(),
  lang: Joi.string().default("en"),
});

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = webappKeysSchema.validate({
    ...req.body,
    ...req.query,
  });

  const { lang = "en" } = req.query;

  if (error) return res.status(400).json({ message: error.message });

  const webappExists = await WebappModel.findById(value.webappId);
  if (!webappExists) {
    return res.status(400).json({ message: "Webapp not found" });
  }

  const paths = getObjectPaths(value.jsonPath);

  if (lang !== "en") {
    const currLang = await LanguageModel.findOne({ code: lang });
    if (!currLang) {
      return res.status(400).json({ message: "Language not found" });
    }
    const results = await Promise.all(
      paths.map(async (path) => {
        try {
          let wordValue = _.get(value.jsonPath, path);
          //prettier-ignore
          const keyDoc = await WebappKeysModel.findOne({
            webappId: value.webappId,
            jsonPath: path,
          })

          if (!keyDoc) return { message: `Key not found` };

          //prettier-ignore
          const word = await WordModel.findOneAndUpdate(
            {  languageId: currLang._id, englishWordId: keyDoc.wordId, },
            { $set: { word: wordValue, }, },
            { upsert: true, returnDocument: "after" }
          );
          return {
            ...keyDoc.toJSON(),
            word: word.toJSON(),
          };
        } catch (err) {
          console.error(err);
          return { message: `Failed to update path ${path}` };
        }
      })
    );

    return res.status(200).json({
      wordappkeys: results,
    });
  }

  // enlgish update
  const enLang = await LanguageModel.findOne({ code: "en" });
  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        let wordValue = _.get(value.jsonPath, path);
        //prettier-ignore
        const word = await WordModel.findOneAndUpdate(
          { word: wordValue, languageId: enLang._id },
          {},
          { upsert: true, returnDocument: "after", }
        );
        //prettier-ignore
        const keyDoc = await WebappKeysModel.findOneAndUpdate(
          { webappId: value.webappId, jsonPath: path, },
          { $set: { wordId: word._id, }, },
          { upsert: true, returnDocument: "after", }
        )

        return {
          ...keyDoc.toJSON(),
          word: word.toJSON(),
        };
      } catch (err) {
        console.error(err);
        return { message: `Failed to update path ${path}` };
      }
    })
  );

  res.status(200).json({
    wordappkeys: results,
  });
};

/**
 * @type {import("../../../../interfaces/types").IEndpointsConfig}
 */
const config = {
  middleware: {
    all: [isAuth],
  },
};

export default config;
