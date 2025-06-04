// src/receipt-processing/receipt-processing.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request as NestRequestDecorator, // Zmieniono alias, aby uniknąć konfliktu nazw i dla jasności
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptProcessingService } from './receipt-processing.service';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Express, Request as ExpressRequest } from 'express'; // Importujemy Request jako ExpressRequest

// Typ dla żądania z uwierzytelnionym użytkownikiem
interface AuthenticatedRequest extends ExpressRequest { // Rozszerzamy ExpressRequest
  user: User; // Po przejściu AuthGuard, user powinien być typu User
}

@ApiTags('receipts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('receipts')
export class ReceiptProcessingController {
  constructor(private readonly receiptProcessingService: ReceiptProcessingService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('receiptImage', {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new BadRequestException('Only image files are allowed! (jpg, jpeg, png, gif)'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 1024 * 1024 * 10, // 10MB
    },
  }))
  @ApiOperation({ summary: 'Upload a receipt image for processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Receipt image file',
    schema: {
      type: 'object',
      properties: {
        receiptImage: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Receipt processed (actual result depends on service implementation)' })
  @ApiResponse({ status: 400, description: 'Bad request or invalid file type/size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadReceipt(
    @UploadedFile() file: Express.Multer.File,
    @NestRequestDecorator() req: AuthenticatedRequest, // Używamy aliasu dla dekoratora
  ) {
    if (!file) {
      throw new BadRequestException('Receipt image file is required.');
    }
    const user = req.user; 

    console.log('Uploaded file:', file.originalname, file.mimetype, file.size);
    console.log(`Receipt uploaded by user ID: ${user.id}, email: ${user.email}`);

    return this.receiptProcessingService.processReceiptImage(file, user);
  }
}