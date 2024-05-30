import { RequestHandler } from "express";
import { isAuth } from "../../../../middlewares/auth.middleware";
import multer from "multer";
import xlsx from "xlsx";
import Joi from "joi";
import LanguageModel from "../../../../models/Language.model";
import WordModel from "../../../../models/Word.model";
import WebappModel from "../../../../models/Webapp.model";
import json2xls from "json2xls";

const excelSchema = Joi.object({
  mimetype: Joi.string()
    .valid(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
      "text/csv",
      "application/xml"
    )
    .required(),
}).unknown(true);

const paramsSchema = Joi.object({
  webappId: Joi.string().required(),
});

/**
 * @type {RequestHandler}
 */
export const POST = async (req, res) => {
  const { value: file, error } = excelSchema.validate(req.file);
  if (error) return res.status(400).json(error);

  const { value, error: paramsError } = paramsSchema.validate(req.query);
  if (paramsError) return res.status(400).json(paramsError);
  const { webappId } = value;

  let data;

  const workbook = xlsx.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  data = xlsx.utils.sheet_to_json(sheet);
  const enWords = data.map((el) => String(el.en).trim());
  const enLang = await LanguageModel.findOne({ code: "en" });
  const langsOfWebapp = await WebappModel.findById(webappId).populate(
    "languages"
  );

  const result = await WordModel.aggregate([
    {
      $match: { word: { $in: enWords }, languageId: enLang._id },
    },
    {
      $lookup: {
        from: "words",
        localField: "_id",
        foreignField: "englishWordId",
        as: "translations",
      },
    },
  ]);

  let excel = data.map((val, idx) =>
    langsOfWebapp.languages.reduce(
      (acc, curr) =>
        curr.code === "en"
          ? acc
          : {
              ...acc,
              [curr.code]: String(
                result
                  .find((el) => el.word === val.en)
                  .translations.find(
                    (v) => v.languageId.toString() === curr._id.toString()
                  )?.word ?? ""
              ).trim(),
            },
      {
        en: val.en,
      }
    )
  );

  return res.xls("fill.xlsx", excel);
};

const upload = multer({ storage: multer.memoryStorage() });
/**
 * @type {import("../../interfaces/types").IEndpointsConfig}
 */
export default {
  middleware: {
    all: [isAuth],
    post: [upload.single("lang_en"), json2xls.middleware],
  },
};
