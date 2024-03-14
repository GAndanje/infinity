import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UploadApiOptions, v2 as cloudinary } from 'cloudinary';
import { UploadResponseDto } from './dto/upload-response.dto';
import * as fs from 'fs';
import { AppConfig } from '../app/app.config';

@Injectable()
export class UploadServiceService {
  async mobileProfileUploadService(
    file: Express.Multer.File,
    userId: string
  ): Promise<UploadResponseDto> {
    try {
      Logger.log(file);
      const url = await this.cloudinaryUploadService(file.path, {
        public_id: userId,
        folder: 'MobileProfilePictures',
      });
      return { message: 'upload successful', url };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async cinemaProfileUploadService(
    files: Express.Multer.File[],
    userId: string
  ): Promise<{ url: string; publicId: string }[]> {
    const uploads = files.map(async (file) => {
      let url: string;
      try {
        if (file.fieldname === 'logoImage') {
          url = await this.cloudinaryUploadService(file.path, {
            folder: `CinemaImages/${userId}`,
            public_id: userId,
          });
        } else {
          url = await this.cloudinaryUploadService(file.path, {
            folder: `CinemaImages/${userId}/others`,
            public_id: file.fieldname,
          });
        }
        return { url, publicId: file.fieldname };
      } catch (error) {
        throw new InternalServerErrorException(error.message);
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploads);

    // Log the results after all uploads are done
    Logger.log(results);

    return results;
  }

  // async deleteUserProfileImage(user: User) {
  //   try {
  //     await this.cloudinaryDeleteService(user.id);
  //     Logger.log('updating user profile to nul------------->');
  //     Object.assign(user, { profileImage: null });
  //     // await this.userService.updateUser(user.id, {
  //     //   profileImage: null,
  //     // });
  //     return 'Profile deleted successfully';
  //   } catch (error) {
  //     throw new InternalServerErrorException('Error updating user on delete');
  //   }
  // }

  async deleteFileFromDisk(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (error) => {
        if (error) {
          Logger.error('Error wiping file on disk:', error.message);
          reject(error);
        } else {
          Logger.log('File wiped from disk successfully.');
          resolve();
        }
      });
    });
  }

  async cloudinaryUploadService(
    filePath: string,
    options: UploadApiOptions
  ): Promise<string> {
    try {
      Logger.log('Uploading file to Cloudinary...');
      cloudinary.config(AppConfig.getCloudinaryConfig());

      const uploadResponse = await cloudinary.uploader.upload(filePath, {
        public_id: options.public_id,
        use_asset_folder_as_public_id_prefix: true,
        folder: options.folder,
      });

      const { secure_url: url } = uploadResponse;
      Logger.log('File uploaded successfully.');

      // Delete the file from the local disk
      await this.deleteFileFromDisk(filePath);

      return url;
    } catch (uploadError) {
      Logger.error('Error uploading to Cloudinary:', uploadError.message);

      // Attempt to delete the file from Cloudinary on upload failure
      try {
        await this.cloudinaryDeleteService(options.public_id);
        Logger.log('File deleted from Cloudinary after upload failure.');
      } catch (deleteError) {
        Logger.error(
          'Error deleting file from Cloudinary:',
          deleteError.message
        );
      }

      throw new Error(`Failed to upload to Cloudinary: ${uploadError.message}`);
    }
  }

  async cloudinaryDeleteService(publicId: string) {
    cloudinary.config(AppConfig.getCloudinaryConfig());
    try {
      const destroy = await cloudinary.uploader.destroy(publicId);
      Logger.log('Cloudinary destroy response:', destroy);
      return destroy;
    } catch (error) {
      Logger.error(
        `Failed to delete image from Cloudinary. Public ID: ${publicId}`,
        error.stack
      );
      throw new Error(error);
    }
  }

  getCloudinaryPublicIdForCinema(userId: string, publicId: string) {
    switch (publicId) {
      case 'logoImage':
        return `CinemaImages/${userId}/${userId}`;
      default:
        return `CinemaImages/${userId}/others/${publicId}`;
    }
  }

  getCloudinaryPublicIdForMobileUser(userId: string) {
    return `MobileProfilePictures/${userId}`;
  }
}
