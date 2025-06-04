// src/receipt-processing/receipt-processing.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ReceiptProcessingController } from './receipt-processing.controller';
import { ReceiptProcessingService } from './receipt-processing.service';
import { ConfigModule } from '@nestjs/config'; // Usunięto ConfigService, jeśli nie jest już potrzebny bezpośrednio w useFactory
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      // Nie potrzebujemy ConfigModule i ConfigService tutaj, jeśli nie używamy 'dest'
      // Jeśli jednak masz inne opcje Multer zależne od konfiguracji, możesz je zostawić.
      // imports: [ConfigModule], 
      useFactory: async () => ({
        // UWAGA: Usunęliśmy opcję 'dest'.
        // Multer domyślnie użyje MemoryStorage, gdy 'storage' ani 'dest' nie są podane.
        // Możesz nadal tutaj ustawić inne opcje, takie jak limity, jeśli potrzebujesz.
        // Na przykład, aby ustawić limit rozmiaru pliku:
        // limits: {
        //   fileSize: 1024 * 1024 * 10, // 10MB
        // },
      }),
      // inject: [ConfigService], // Niepotrzebne, jeśli useFactory nie używa configService
    }),
    ShoppingListsModule,
    AuthModule,
  ],
  controllers: [ReceiptProcessingController],
  providers: [ReceiptProcessingService],
})
export class ReceiptProcessingModule {}