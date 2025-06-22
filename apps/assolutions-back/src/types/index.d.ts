// types/express/index.d.ts
import * as multer from 'multer';

declare global {
  namespace Express {
    export interface Multer {
      File: multer.File;
    }
  }
}
