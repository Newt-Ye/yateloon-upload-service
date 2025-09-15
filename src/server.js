import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import cors from 'cors'

const app = express();
const PORT = process.env.PORT || 3010;
const UPLOAD_ROOT = path.resolve('./uploads');

// 基本設定：允許所有來源
app.use(cors());

// 確保目錄存在
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

// 自訂 storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 預設：用日期路徑
    const now = new Date();
    const datePath = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 支援 query 或 body
    // req.body 在這裡通常是空的，除非先經過另一層 multer 處理
    // 所以這裡優先用 query.folder
    const customFolder = req.query.folder || req.body?.folder;

    // 安全過濾（避免 ../ 之類的字）
    const safeFolder = customFolder
      ? customFolder.replace(/[^a-zA-Z0-9-_\/]/g, '')
      : datePath;

    const targetDir = path.join(UPLOAD_ROOT, safeFolder);
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'bin';
    cb(null, `${uuidv4()}.${ext}`);
  },
});

const upload = multer({ storage });

// 單檔上傳
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const relPath = path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');

  res.json({
    ok: true,
    folder: req.query.folder || req.body.folder || 'date-based',
    file: {
      originalName: file.originalname,
      mime: file.mimetype,
      size: file.size,
      key: relPath,
      url: `/uploads/${relPath}`,
    },
  });
});

// 多檔上傳
app.post('/upload/multi', upload.array('files', 10), (req, res) => {
  const files = (req.files || []).map((f) => {
    const relPath = path.relative(UPLOAD_ROOT, f.path).split(path.sep).join('/');
    return {
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
      key: relPath,
      url: `/uploads/${relPath}`,
    };
  });
  res.json({
    ok: true,
    folder: req.query.folder || req.body.folder || 'date-based',
    files,
  });
});

app.post('/delete', (req, res) => {
  const { folder, filenames } = req.body;

  if (!folder || !Array.isArray(filenames)) {
    return res.status(400).json({ error: 'Missing folder or filenames[]' });
  }

  const baseDir = path.join(__dirname, '../uploads', folder);

  const deleted = [];
  const errors = [];

  filenames.forEach(filename => {
    const filePath = path.join(baseDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deleted.push(filename);
      } catch (err) {
        errors.push({ filename, error: err.message });
      }
    }
  });

  return res.json({ deleted, errors });
});

// 靜態檔案存取
app.use('/uploads', express.static(UPLOAD_ROOT));

// 健康檢查
app.get('/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Upload API listening on http://127.0.0.1:${PORT}`);
});
