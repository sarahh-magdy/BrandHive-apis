import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_TYPES = /jpeg|jpg|png|webp/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const multerMemoryConfig = {
  storage: memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const isValid = ALLOWED_TYPES.test(file.mimetype);

    if (isValid) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Only jpeg, jpg, png, webp allowed',
        ),
        false,
      );
    }
  },
};