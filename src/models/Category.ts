import mongoose, { Schema } from 'mongoose';

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    level: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ parentId: 1, order: 1 });
CategorySchema.index({ slug: 1 });

export const Category = mongoose.model('Category', CategorySchema);
