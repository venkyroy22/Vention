import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    color: { type: String, default: 'indigo' },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Note = mongoose.model('Note', noteSchema);
export default Note;
