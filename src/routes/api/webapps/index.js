import { RequestHandler } from "express";
import Joi from "joi";
import WebappModel from "../../../models/Webapp.model";
import LanguageModel from "../../../models/Language.model";
import { isAuth } from "../../../middlewares/auth.middleware";

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  try {
    const webapps = await WebappModel.find({
      archived: false,
    }).populate({
      path: "languages",
      select: "name code",
    });
    return res.status(200).json({ webapps });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const webappSchema = Joi.object({
  name: Joi.string().required(),
  languages: Joi.array().unique().default(["en"]),
});

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = webappSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.message });

  try {
    const nameExist = await WebappModel.findOne({ name: value.name });
    if (nameExist) {
      return res.status(400).json({ message: "Name already exists" });
    }

    const langIdsArr = await LanguageModel.find({
      code: { $in: ["en", ...value.languages.filter((el) => el !== "en")] },
    }).then((langs) => langs.map(({ _id }) => _id));

    if (langIdsArr.length !== value.languages.length) {
      return res.status(400).json({ message: "Language not found" });
    }

    const webapp = await WebappModel.create({
      name: value.name,
      languages: langIdsArr,
    });
    return res.status(201).json({ webapp });
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
