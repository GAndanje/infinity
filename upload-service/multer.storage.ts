import { diskStorage } from 'multer';
import * as path from 'path';

export const multerStorage = {
  storage: diskStorage({
    destination: './uploads', // Set your upload directory
    filename: (req, file, cb) => {
      const filename = `${Date.now()}${path.extname(file.originalname)}`;
      cb(null, filename);
    },
  }),
};
