import Joi from "joi";
import { hasApiKey } from "../../../middlewares/auth.middleware";
import LanguageModel from "../../../models/Language.model";
import WordModel from "../../../models/Word.model";
import { ALLOWED_API_KEYS } from "../../../config/envs";

const StringOrObject = Joi.alternatives(
  Joi.string(),
  Joi.object().pattern(Joi.string(), Joi.link("#StringOrObject"))
).id("StringOrObject");

const GetTransalationsSchema = Joi.object({
  lang: Joi.string().required(),
  json: Joi.object().pattern(Joi.string(), StringOrObject).required(),
});

function getLeafs(obj, values = []) {
  if (typeof obj === "string") return [...values, obj];
  return Object.values(obj).flatMap((value) => getLeafs(value, values));
}

function translateObj(obj, translations) {
  if (typeof obj === "string")
    return translations.find((t) => t.word === obj)?.translation || obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      translateObj(value, translations),
    ])
  );
}

/**
 * @type {import("express").RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = GetTransalationsSchema.validate(req.body);
  if (error) return res.status(400).json(error);

  const enLang = await LanguageModel.findOne({ code: "en" });
  if (!enLang)
    return res
      .status(500)
      .json({ message: "Something went wrong (cannot find english language)" });
  const lang = await LanguageModel.findOne({ code: value.lang });
  if (!lang) return res.status(400).json({ message: "Language not found" });

  let enWords = getLeafs(value.json);

  let translations = await WordModel.aggregate([
    { $match: { word: { $in: enWords }, languageId: enLang._id } },
    {
      $lookup: {
        from: "words",
        localField: "_id",
        foreignField: "englishWordId",
        as: "translation",
        pipeline: [{ $match: { languageId: lang._id } }],
      },
    },
    {
      $project: {
        word: 1,
        translation: {
          $cond: {
            if: { $eq: [{ $size: "$translation" }, 0] },
            then: "$word",
            else: { $arrayElemAt: ["$translation.word", 0] },
          },
        },
      },
    },
  ]);

  const translatedObj = translateObj(value.json, translations);

  res.status(200).json(translatedObj);
};

export default {
  middleware: {
    all: [hasApiKey(ALLOWED_API_KEYS)],
  },
};
