import Joi from "joi";
import LanguageModel from "../../../../../models/Language.model";
import WebappModel from "../../../../../models/Webapp.model";
import mongoose from "mongoose";
import WebappKeysModel from "../../../../../models/WebappKeys.model";
import _ from "lodash";
import JSZip from "jszip";
import fs from "fs";
import { isAuth } from "../../../../../middlewares/auth.middleware";

const getWebappKeysSchema = Joi.object({
  webappId: Joi.string().required(),
});

/**
 * @type {RequestHandler}
 */
export const GET = async (req, res) => {
  const { value, error } = getWebappKeysSchema.validate(req.query);

  if (error) return res.status(400).json({ message: error.message });

  try {
    const webappExists = await WebappModel.findById(value.webappId);
    if (!webappExists) {
      return res.status(400).json({ message: "Webapp not found" });
    }

    const languagesArr = await LanguageModel.find({
      _id: { $in: webappExists.languages },
    });

    //prettier-ignore
    const aggr = [
        { $match: { webappId: new mongoose.Types.ObjectId(value.webappId) } },
        { $lookup: { from: "words", localField: "wordId", foreignField: "_id", as: "enWord", }, },
        { $unwind: "$enWord" },
      ];

    let result = await Promise.all(
      languagesArr.map(async (lang) => {
        let tempAggr = [...aggr];

        //prettier-ignore
        tempAggr.push({$lookup: { from: "words", localField: "wordId", foreignField: "englishWordId", pipeline: [{ $match: { languageId: lang._id } }], as: "word", },});

        tempAggr.push({
          $unwind: {
            path: "$word",
            preserveNullAndEmptyArrays: true,
          },
        });

        return { [lang.code]: await WebappKeysModel.aggregate(tempAggr) };
      })
    );

    let zip = new JSZip();

    const constructedObj = {};
    result.forEach((lang) => {
      lang[Object.keys(lang)[0]].forEach(async (key) => {
        _.set(
          constructedObj,
          key.jsonPath,
          key?.word?.word || key?.enWord?.word
        );
      });
      zip.file(
        `lang_${Object.keys(lang)[0]}.json`,
        JSON.stringify(constructedObj, null, 2).replace(/\u2028/g, "\\u2028")
      );
    });

    const content = await zip.generateAsync({ type: "nodebuffer" });

    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", "attachment; filename=lang.zip");
    res.set("Content-Length", content.length);
    return res.status(200).send(content);
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
