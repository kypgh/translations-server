import { RequestHandler } from "express";
import LanguageModel from "../../../models/Language.model";
import Joi from "joi";

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  try {
    const languages = await LanguageModel.find();
    return res.status(200).json({ languages });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const languageSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
});

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = languageSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.message });

  const codeExist = await LanguageModel.findOne({ code: value.code });

  if (codeExist) {
    return res.status(400).json({ message: "Code already exists" });
  }

  const language = await LanguageModel.create(value);
  return res.status(201).json({ language });
};
