import { RequestHandler } from "express";
import Joi from "joi";
import multer from "multer";
import xlsx from "xlsx";
import WordModel from "../../../models/Word.model";
import LanguageModel from "../../../models/Language.model";
import mongoose from "mongoose";
import { isAuth } from "../../../middlewares/auth.middleware";

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  res.status(200).json({ message: "Nothing to see here (⓿_⓿)" });
};

const fileValidation = Joi.object({
  mimetype: Joi.string()
    .valid(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      // "application/json",
      // "text/csv",
      // "application/xml"
    )
    .required(),
}).unknown(true);

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value, error } = fileValidation.validate(req.file);
  if (error) return res.status(400).json(error);

  let data = null;

  if (
    value.mimetype ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    data = xlsx.utils.sheet_to_json(sheet);
  } else {
    res.status(400).json({ message: "Invalid file type" });
    return;
  }

  data = data.map((el) => {
    const obj = {};
    for (const [key, value] of Object.entries(el)) {
      obj[key.toLowerCase().trim()] = value;
    }
    return obj;
  });

  // Any languages without en we cannot do anything
  data = data.filter((el) => !!el.en);
  // --- setup
  const languages = await LanguageModel.find({});
  const langEn = languages.find((lang) => lang.code === "en");
  const session = await mongoose.startSession();

  try {
    const enWords = data.map((el) => String(el.en).trim());
    const existingEnWords = await WordModel.find({
      word: { $in: enWords },
      languageId: langEn._id,
    });

    const newWords = enWords.filter(
      (el) => -1 == existingEnWords.findIndex((el2) => el2.word === el)
    );

    const englishWords = await WordModel.create(
      newWords
        .filter((a) => a !== "")
        .map((el) => ({ word: el, languageId: langEn._id }))
    ).then((res) => res.concat(existingEnWords));

    const translatedWordsToUpsert = [];
    for (const obj of data) {
      if (!obj.en) continue;
      const englishWordId = englishWords.find(
        (el) => el.word === String(obj.en).trim()
      )?._id;
      if (!englishWordId) {
        continue;
      }

      for (const [lang, word] of Object.entries(obj)) {
        if (lang.toLowerCase() === "en") continue;
        const langDoc = languages.find((el) => el.code === lang.toLowerCase());
        if (!langDoc) continue;

        if (
          translatedWordsToUpsert
            .filter((a) => a != "")
            .findIndex(
              (el) => el.word === word && el.languageId === langDoc._id
            ) >= 0
        )
          continue;

        translatedWordsToUpsert.push({
          word:
            String(word).trim() ||
            englishWords.find((o) => o._id === englishWordId).word,
          englishWordId: englishWordId,
          languageId: langDoc._id,
        });
      }
    }

    try {
      session.startTransaction();
      const delResult = await WordModel.deleteMany(
        {
          word: { $in: translatedWordsToUpsert.map((el) => el.word) },
          languageId: { $not: { $eq: langEn._id } },
        },
        { session }
      );

      const bulkWrite = await WordModel.insertMany(translatedWordsToUpsert, {
        session,
      });

      await session.commitTransaction();
      await session.endSession();

      return res.status(200).json({ message: "Uploaded" });
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const upload = multer({ storage: multer.memoryStorage() });
/**
 * @type {import("../../interfaces/types").IEndpointsConfig}
 */
export default {
  middleware: {
    all: [upload.single("translations"), isAuth],
  },
};
