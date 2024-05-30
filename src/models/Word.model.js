import mongoose from "mongoose";
import LanguageModel from "./Language.model";
const { Schema } = mongoose;

const WordSchema = new Schema(
  {
    word: { type: String, required: true },
    languageId: {
      type: Schema.Types.ObjectId,
      ref: LanguageModel.modelName,
      required: true,
    },
    englishWordId: { type: Schema.Types.ObjectId, ref: "Word" },
  },
  { timestamps: true }
);

export default mongoose.model("Word", WordSchema);
