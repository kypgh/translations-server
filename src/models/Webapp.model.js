import mongoose from "mongoose";
import LanguageModel from "./Language.model";

const { Schema } = mongoose;

const WebappSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    languages: [
      {
        type: Schema.Types.ObjectId,
        ref: LanguageModel.modelName,
      },
    ],
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Webapp", WebappSchema);
