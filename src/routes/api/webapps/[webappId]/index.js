import { RequestHandler } from "express";
import Joi from "joi";
import WebappModel from "../../../../models/Webapp.model";
import LanguageModel from "../../../../models/Language.model";
import { isAuth } from "../../../../middlewares/auth.middleware";

const matchSchema = Joi.object({
  webappId: Joi.string().required(),
});

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  const { value, error } = matchSchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const result = await WebappModel.findById(value.webappId).populate({
      path: "languages",
      select: "name code",
    });

    if (!result) {
      return res.status(400).json({ message: "Webapp not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const webappUpdateSchema = Joi.object({
  name: Joi.string(),
  languages: Joi.array().unique().default(["en"]),
});

const querySchema = Joi.object({
  webappId: Joi.string().required(),
});

/**
 * @type {RequestHandler}
 */
export const PUT = async (req, res) => {
  const { value, error } = webappUpdateSchema.validate(req.body);
  const { value: queryValue, error: queryError } = querySchema.validate(
    req.query
  );
  if (queryError) return res.status(400).json({ message: queryError.message });
  if (error) return res.status(400).json({ message: error.message });

  const { webappId } = queryValue;

  try {
    const langIdsArr = await LanguageModel.find({
      code: { $in: ["en", ...value.languages.filter((el) => el !== "en")] },
    }).then((langs) => langs.map(({ _id }) => _id));

    if (langIdsArr.length !== value.languages.length) {
      return res.status(400).json({ message: "Language not found" });
    }

    const webapp = await WebappModel.findByIdAndUpdate(
      webappId,
      { name: value.name, languages: langIdsArr },
      {
        new: true,
      }
    );
    return res.status(200).json({ webapp });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * @type {RequestHandler}
 */
export const DELETE = async (req, res) => {
  const { value, error } = matchSchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const result = await WebappModel.findByIdAndUpdate(
      {
        _id: value.webappId,
      },
      {
        archived: true,
      }
    );

    if (!result) {
      return res.status(400).json({ message: "Webapp not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
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
