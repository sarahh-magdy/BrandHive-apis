import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: any,
  ) {}

  // ─── Upload Single Image ─────────────────────────────
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error: any, result: UploadApiResponse) => {
          if (error) return reject(new BadRequestException(error.message));

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // ─── Upload Multiple Images ───────────────────────────
  async uploadImages(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<{ url: string; publicId: string }[]> {
    if (!files?.length) return [];

    return Promise.all(
      files.map((file) => this.uploadImage(file, folder)),
    );
  }

  // ─── Delete Single Image ──────────────────────────────
  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
  }

  // ─── Delete Multiple Images ───────────────────────────
  async deleteImages(publicIds: string[]): Promise<void> {
    if (!publicIds?.length) return;

    await Promise.all(
      publicIds.map((id) => this.deleteImage(id)),
    );
  }

  // ─── Validate File ────────────────────────────────────
  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only jpeg, jpg, png, webp are allowed',
      );
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size must be under 5MB');
    }
  }
}