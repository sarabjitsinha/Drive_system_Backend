import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: String,
  type: String, // 'file' or 'folder'
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  path: String, // For file location
}, { timestamps: true });

export default mongoose.model('File', fileSchema);

