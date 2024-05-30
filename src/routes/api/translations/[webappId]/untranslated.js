import { RequestHandler } from "express";
import LanguageModel from "../../../../models/Language.model";
import Joi from "joi";
import WebappKeysModel from "../../../../models/WebappKeys.model";
import WebappModel from "../../../../models/Webapp.model";
import json2xls from "json2xls";
import { isAuth } from "../../../../middlewares/auth.middleware";

const getUntranslatedWordsSchema = Joi.object({
  webappId: Joi.string().required(),
  jsonPath: Joi.string(),
});

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  const { value, error } = getUntranslatedWordsSchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });

  const currWebapp = await WebappModel.findById(value.webappId);

  if (!currWebapp) {
    return res.status(400).json({ message: "Webapp not found" });
  }
  let page;
  if (value.jsonPath) {
    page = { jsonPath: { $regex: `^${value.jsonPath}`, $options: "i" } };
  }

  const languages = await LanguageModel.find({ code: { $ne: "en" } });

  const currKeys = await WebappKeysModel.aggregate([
    { $match: { webappId: currWebapp._id, ...(page || {}) } },
    {
      $lookup: {
        from: "words",
        localField: "wordId",
        foreignField: "_id",
        as: "enWord",
      },
    },
    { $unwind: "$enWord" },

    {
      $lookup: {
        from: "words",
        localField: "wordId",
        foreignField: "englishWordId",
        as: "translations",
        pipeline: [
          {
            $sort: { createdAt: -1 },
          },
        ],
      },
    },
  ]);
  let result = currKeys.map((doc) => ({
    en: doc.enWord.word,
    ...languages.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.code]:
          doc.translations.find(
            (v) =>
              v.languageId.toString() === curr._id.toString() &&
              v.word !== doc.enWord.word
          )?.word ?? "",
      };
    }, {}),
  }));

  return res.xls("untranslated.xlsx", result);
};

/**
 * @type {import("../../../../interfaces/types").IEndpointsConfig}
 */
const config = {
  middleware: {
    get: [json2xls.middleware],
    all: [isAuth],
  },
};

export default config;
