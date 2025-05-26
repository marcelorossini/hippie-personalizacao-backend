import { Router, Request, Response } from 'express';
import multer from 'multer';
import { removeBackground } from '../utils/imageUtils';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseUtils';
import { uploadLimiter } from '../middlewares/rateLimiter';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for disk storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueFilename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Route to remove background from an image
router.post('/background-remover',
  uploadLimiter,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return sendErrorResponse(res, 'Nenhuma imagem foi enviada', 400);
      }

      const processedImageUrl = await removeBackground(req.file.path);

      // Clean up the temporary file
      fs.unlinkSync(req.file.path);

      return sendSuccessResponse(res, 'Background removido com sucesso', {
        processedImageUrl
      });
    } catch (error) {
      console.error('Erro ao remover background:', error);
      return sendErrorResponse(res, 'Erro ao processar a imagem');
    }
  }
);

export default router; 