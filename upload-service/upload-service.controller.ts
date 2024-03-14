import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  Logger,
  Req,
  UnauthorizedException,
  UseGuards,
  UploadedFiles,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guard/JWT-auth.guard';
import { cinemaImageUploadFields } from '@/shared/constants/constants';
import { UploadServiceService } from './upload-service.service';

@Controller('upload-service')
@UseGuards(JwtAuthGuard)
export class UploadServiceController {
  constructor(private readonly uploadServiceService: UploadServiceService) {}

  @Post('upload/profile-picture')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      dest: './.uploads',
      limits: { fields: 1, fileSize: 2000000 },
    })
  )
  async mobileProfileUpload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        // .addFileTypeValidator({ fileType: 'jpg|png|jpeg|gif' })
        .addMaxSizeValidator({ maxSize: 2000000 })
        .build({
          // errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        })
    )
    file: Express.Multer.File,
    @Req() req: any
  ) {
    if ('googleId' in req.user) {
      Logger.log('uploading file');
      // Logger.log(file)
      return this.uploadServiceService.mobileProfileUploadService(
        file,
        req.user.id
      );
    }
    throw new UnauthorizedException('Accessing mobile route');
  }

  // todo - Guard against unacceptable files using filetype and magic number
  @Post('upload/cinema-images')
  @UseInterceptors(
    FileFieldsInterceptor(cinemaImageUploadFields(), {
      dest: './.uploads',
      limits: { fieldSize: 2000000, fields: 0, files: 5 },
    })
  )
  async cinemaProfileUpload(
    @UploadedFiles() files,
    // new ParseFilePipeBuilder()
    //   .addMaxSizeValidator({ maxSize: 2000000 })
    //   .addFileTypeValidator({ fileType: '(jpg|png|jpeg|gif)' })
    //   .build({
    //     errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    //     fileIsRequired: false,
    //   })
    @Req() req: any
  ) {
    Logger.log('Received file upload request..............');
    if ('googleId' in req.user) {
      throw new UnauthorizedException('Accessing cinema route');
    }
    Logger.log(Object.entries(files).map((file) => file[1][0]));
    const filesArray = Object.entries(files).map((file) => file[1][0]);
    Logger.log('Uploading files');
    return this.uploadServiceService.cinemaProfileUploadService(
      filesArray,
      req.user.id
    );
  }
}
