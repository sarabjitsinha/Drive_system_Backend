import express from 'express';
import multer from 'multer';
import File from '../models/File.js';
import auth from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/tmp/' });

async function deleteFileAndChildren(fileId, userId) {
  const file = await File.findById(fileId);
  if (!file || file.owner.toString() !== userId) return;

  const fullPath = path.join(file.path, file.name);
  // console.log(`[Delete] Deleting ${file.type}: ${file.name} at ${fullPath}`);

  if (file.type === 'file') {

    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);  //synchronous operation is being done as the files/folders to be deleted first before moving ahead 
  } else {
    const children = await File.find({ parent: file._id });
    for (const child of children) {
      await deleteFileAndChildren(child._id, userId);
    }
    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }

  await File.deleteOne({ _id: file._id });
}

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteFileAndChildren(req.params.id, req.user.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete file or folder' });
  }
});


// Getting all files from Db 

router.get('/', auth, async (req, res) => {
  const files = await File.find({ owner: req.user.id });
  res.json(files);
});


// Allowing user-defined nested path for upload

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  
  try 
  {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { originalname, path: tempPath } = req.file;
    const folderPath = req.body.path || '';
    const segments = folderPath.split('/').filter(Boolean);

    let currentPath = 'uploads';
    let parent = null;

    for (const segment of segments) {
      currentPath = path.join(currentPath, segment);
      const existing = await File.findOne({ name: segment, type: 'folder', path: path.dirname(currentPath), owner: req.user.id });

      if (!existing) {
        fs.mkdirSync(currentPath, { recursive: true });
        const folder = await File.create({ name: segment, type: 'folder', path: path.dirname(currentPath), parent, owner: req.user.id });
        parent = folder._id;
      }
       else {
        parent = existing._id;
      }
    }

    const finalPath = path.join(currentPath, originalname);
    fs.renameSync(tempPath, finalPath);

    
    const file = await File.create({
      name: originalname,
      type: 'file',
      path: currentPath,
      parent,
      owner: req.user.id,
    });

    res.status(201).json(file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});


// Retrieve file by ID and serve it

router.get('/download/:id', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || file.type !== 'file' || file.owner.toString() !== req.user.id) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fullPath = path.join(file.path, file.name);
    res.download(fullPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed' });
  }
});

//User defined nested path

router.post('/create-path', auth, async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    const segments = folderPath.split('/').filter(Boolean);

    let currentPath = 'uploads';
    let parent = null;
    let lastCreatedFolder = null;

    for (const segment of segments) {
      currentPath = path.join(currentPath, segment);

      const existing = await File.findOne({ name: segment, type: 'folder', path: path.dirname(currentPath), owner: req.user.id });
      if (!existing) {
        fs.mkdirSync(currentPath, { recursive: true });
        lastCreatedFolder = await File.create({ name: segment, type: 'folder', path: path.dirname(currentPath), parent, owner: req.user.id });
        parent = lastCreatedFolder._id;
      } else {
        parent = existing._id;
      }
    }

    res.status(201).json({ message: 'Path created', folder: lastCreatedFolder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Path creation failed' });
  }
});


export default router;
