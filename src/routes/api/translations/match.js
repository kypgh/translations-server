import { RequestHandler } from "express";
import Joi from "joi";
import WordModel from "../../../models/Word.model";
import LanguageModel from "../../../models/Language.model";
import { isAuth } from "../../../middlewares/auth.middleware";

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  res.status(200).json({ message: "server is running" });
};

const matchSchema = Joi.object({
  word: Joi.string().required(),
  toLang: Joi.string().default("en"),
});

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = matchSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const fromLanguage = await LanguageModel.findOne({ code: value.toLang });

  if (!fromLanguage) {
    return res.status(400).json({ message: "Language not found" });
  }

  try {
    const dictionary = await WordModel.aggregate([
      {
        $search: {
          index: "custom",
          text: {
            query: [value.word],
            path: ["word"],
            fuzzy: {
              maxEdits: 2,
            },
          },
        },
      },
      {
        $match: {
          languageId: fromLanguage._id,
        },
      },
      {
        $limit: 20,
      },
      {
        $lookup: {
          from: "words",
          localField: value.toLang === "en" ? "_id" : "englishWordId",
          foreignField: value.toLang === "en" ? "englishWordId" : "_id",
          pipeline: [
            {
              $lookup: {
                from: "languages",
                localField: "languageId",
                foreignField: "_id",
                as: "language",
              },
            },
            {
              $project: {
                _id: 0,
                word: 1,
                englishWordId: 1,
                language: "$language.code",
              },
            },
            {
              $addFields: {
                language: {
                  $arrayElemAt: ["$language", 0],
                },
              },
            },
          ],
          as: "translations",
        },
      },
      {
        $project: {
          _id: 0,
          word: 1,
          translations: 1,
          englishWordId: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $sort: { score: -1 } },
    ]);

    return res.status(200).json({ result: dictionary });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error.message });
  }
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
