import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['text', 'note', 'task', 'drawing', 'view-once-image'], default: 'text' },
    attachmentId: { type: String },
    imageUrl: { type: String },
    isViewed: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    reactions: [reactionSchema],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    replyTo: {
      message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
      text: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
export default Message;
