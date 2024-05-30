import mongoose from "mongoose";

const { Schema } = mongoose;

const LanguageSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("Language", LanguageSchema);
