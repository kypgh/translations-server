import mongoose from "mongoose";
import WebappModel from "./Webapp.model";
import WordModel from "./Word.model";

const { Schema } = mongoose;

const WebappKeysSchema = new Schema(
  {
    webappId: {
      type: Schema.Types.ObjectId,
      ref: WebappModel.modelName,
      required: true,
    },
    jsonPath: { type: String, required: true },
    wordId: {
      type: Schema.Types.ObjectId,
      ref: WordModel.modelName,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("WebappKeys", WebappKeysSchema);
