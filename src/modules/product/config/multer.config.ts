import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|webp/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const productMulterConfig = {
  storage: diskStorage({
    destination: './uploads/products',
    filename: (_req, file, cb) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;
      cb(null, uniqueName);
    },
  }),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max 10 images per product
  },

  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;

    if (ALLOWED_IMAGE_TYPES.test(ext) && ALLOWED_IMAGE_TYPES.test(mime)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Only image files are allowed (jpeg, jpg, png, webp)',
        ),
        false,
      );
    }
  },
};