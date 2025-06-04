import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ShoppingListsService } from '../shopping-lists/shopping-lists.service';
import { User } from '../entities/user.entity';
import { Express } from 'express';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';

interface ParsedReceiptItem {
  name: string;
  quantity: number;
  pricePerUnit?: number;
  totalPrice: number;
  category?: string;
  vatRate?: string;
}

interface ParsedReceiptData {
  storeName?: string;
  purchaseDate?: Date;
  items: ParsedReceiptItem[];
  totalAmount?: number;
  nip?: string;
  currency?: string;
}

@Injectable()
export class ReceiptProcessingService {
  private readonly visionClient: ImageAnnotatorClient;

  constructor(
    private readonly shoppingListsService: ShoppingListsService,
  ) {
    this.visionClient = new ImageAnnotatorClient();
    console.log('Google Cloud Vision API Client Initialized.');
  }

  async processReceiptImage(file: Express.Multer.File, user: User): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded for OCR processing.');
    }
    if (!file.buffer) {
        throw new BadRequestException('Uploaded file buffer is missing.');
    }

    console.log(`Processing receipt image: ${file.originalname} for user: ${user.email} using Google Cloud Vision API`);
    
    let ocrTextResult = '';
    let visionApiResult: protos.google.cloud.vision.v1.IAnnotateImageResponse | null = null;

    try {
      console.log('Sending image to Google Cloud Vision API for text detection...');
      
      const [result] = await this.visionClient.documentTextDetection({
        image: { content: file.buffer },
        imageContext: { languageHints: ['pl', 'en'] },
      });
      visionApiResult = result;

      if (visionApiResult.fullTextAnnotation && visionApiResult.fullTextAnnotation.text) {
        ocrTextResult = visionApiResult.fullTextAnnotation.text;
        console.log('Google Cloud Vision API - Full Text Result:\n', ocrTextResult);
      } else {
        console.log('No text detected by Google Cloud Vision API.');
        throw new BadRequestException('No text could be detected in the uploaded image.');
      }

      const parsedData = this.parseOcrTextToStructuredData(ocrTextResult, visionApiResult.fullTextAnnotation);
      console.log("Parsed receipt data:", JSON.stringify(parsedData, null, 2));

      if (parsedData.items.length === 0) {
        console.warn("No items were parsed from the receipt. Shopping list will be empty or may not be created.");
      }

      if (parsedData.items.length > 0) {
        const shoppingListItemsDto = parsedData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          category: item.category || 'Z paragonu',
          bought: true, 
        }));

        const listName = parsedData.storeName || `Paragon ${parsedData.purchaseDate ? parsedData.purchaseDate.toLocaleDateString('pl-PL') : new Date().toLocaleDateString('pl-PL')}`;
        const newShoppingList = await this.shoppingListsService.create(user, {
          name: listName,
          items: shoppingListItemsDto,
        });

        return {
          message: 'Receipt processed successfully using Google Cloud Vision and shopping list created.',
          ocrRawText: ocrTextResult,
          parsedData: parsedData,
          shoppingListId: newShoppingList.id,
        };
      } else {
        return {
          message: 'Receipt processed, but no items could be reliably parsed to create a shopping list.',
          ocrRawText: ocrTextResult,
          parsedData: parsedData,
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown OCR processing error';
      console.error('Error processing receipt image with Google Cloud Vision:', errorMessage, error);
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Google API Error Code:', (error as any).code);
        console.error('Google API Error Details:', (error as any).details);
      }
      throw new InternalServerErrorException(`Failed to process receipt with Google Cloud Vision: ${errorMessage}`);
    }
  }

  private parseOcrTextToStructuredData(
    fullText: string,
    textAnnotation?: protos.google.cloud.vision.v1.ITextAnnotation | null
  ): ParsedReceiptData {
    console.log("Parsing OCR text - Biedronka specific v10...");
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const items: ParsedReceiptItem[] = [];
    let storeName: string | undefined = "Biedronka";
    let purchaseDate: Date | undefined = undefined;
    let totalAmount: number | undefined = undefined;
    let nip: string | undefined = undefined;
    let currency: string = 'PLN';

    // Regex patterns
    const dateTimeRegex = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/;
    const nipRegex = /NIP\s*(\d{10}|\d{3}-\d{3}-\d{2}-\d{2})/;
    const productNameCandidateRegex = /^(?!PTU\s+Ilość|Cena|Wartość|PARAGON FISKALNY|SUMA|SPRZEDAŻ OPODATKOWANA|KARTA PŁATNICZA|NIP\s|DATA\s|NAZWA\s|NR:|CODZIENNIE NISKIE CENY|BIEDRONKA)([A-ZĄĆĘŁŃÓŚŹŻ\s\d\.\-\/"()%]+?)(?:\s+\d+[,.]?\d*\s*(?:g|kg|ml|l|szt\.?))?$/i;
    const priceRegex = /^(\d+[,.]\d{2})$/;

    // Parse store name
    const biedronkaFullNameLine = lines.find(line => line.toUpperCase().includes('BIEDRONKA "CODZIENNIE NISKIE CENY"'));
    if (biedronkaFullNameLine) {
        const matchBiedronkaNum = biedronkaFullNameLine.match(/BIEDRONKA.*?(\d{4})/);
        storeName = matchBiedronkaNum ? `Biedronka ${matchBiedronkaNum[1]}` : "Biedronka";
    } else if (lines.find(line => line.toUpperCase().startsWith("BIEDRONKA"))) {
        storeName = "Biedronka";
    }
    if (!storeName) storeName = "Paragon";

    // Find purchase date
    for (const line of lines) {
        const dateMatch = line.match(dateTimeRegex);
        if (dateMatch) {
            const [, dayStr, monthStr, yearStr, hourStr, minuteStr, secondStr] = dateMatch;
            const day = parseInt(dayStr, 10);
            const month = parseInt(monthStr, 10) - 1; // Months are 0-based in JS Date
            const year = parseInt(yearStr, 10);
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            const second = parseInt(secondStr, 10);

            purchaseDate = new Date(year, month, day, hour, minute, second);
            console.log(`[+] Parsed Date: ${purchaseDate.toISOString()}`);
            break;
        }
    }

    // Parse NIP
    for (const line of lines) {
        const nipMatch = line.match(nipRegex);
        if (nipMatch && nipMatch[1]) {
            nip = nipMatch[1].replace(/-/g, '');
            console.log(`[+] Parsed NIP: ${nip}`);
            break;
        }
    }

    // Find detail header index
    let detailHeaderIndex = -1;
    for (let i = 0; i < lines.length - 2; i++) {
        if (lines[i].toUpperCase().includes("PTU ILOŚĆ") && lines[i + 1].toUpperCase() === "CENA" && lines[i + 2].toUpperCase() === "WARTOŚĆ") {
            detailHeaderIndex = i + 2; // After "WARTOŚĆ"
            console.log(`[+] Detail header found at index ${detailHeaderIndex}`);
            break;
        }
    }

    // Collect potential item names before detail header
    const potentialItemNames: string[] = [];
    let inItemSection = false;
    for (let i = 0; i < (detailHeaderIndex !== -1 ? detailHeaderIndex : lines.length); i++) {
        const line = lines[i];
        if (line.toUpperCase().includes("PARAGON FISKALNY")) {
            inItemSection = true;
            continue;
        }
        if (inItemSection) {
            const nameMatch = line.match(productNameCandidateRegex);
            if (nameMatch && nameMatch[1]) {
                const candidate = nameMatch[1].trim();
                if (candidate.length > 2 && candidate.length < 80 && !/^\d{2,}/.test(candidate)) {
                    potentialItemNames.push(candidate);
                    console.log(`   [*] Potential item name: "${candidate}"`);
                }
            }
        }
    }

    // Parse item details starting after detail header
    const detailGroups: string[][] = [];
    if (detailHeaderIndex !== -1) {
        let i = detailHeaderIndex + 1;
        while (i < lines.length - 3) {
            if (lines[i].toUpperCase().startsWith("SUMA")) break;
            // Each detail group is 4 lines: VAT, quantity, price per unit, total price
            const group = [lines[i], lines[i + 1], lines[i + 2], lines[i + 3]];
            detailGroups.push(group);
            i += 4;
        }
    }

    // Match item names with details
    for (let idx = 0; idx < detailGroups.length && idx < potentialItemNames.length; idx++) {
        const group = detailGroups[idx];
        const name = potentialItemNames[idx];
        const vatRate = group[0].trim();
        const quantityStr = group[1].replace(/\s*x$/i, '').trim();
        const quantity = parseInt(quantityStr) || 1;
        const pricePerUnit = parseFloat(group[2].replace(',', '.'));
        const totalPrice = parseFloat(group[3].replace(',', '.'));

        items.push({
            name,
            quantity,
            pricePerUnit: isNaN(pricePerUnit) ? undefined : pricePerUnit,
            totalPrice,
            vatRate,
            category: "Z paragonu"
        });
        console.log(`   [+] Added Item: ${name} | Qty: ${quantity} | Price: ${pricePerUnit} | Total: ${totalPrice} | VAT: ${vatRate}`);
    }

    // Parse total amount
    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].toUpperCase().includes("SUMA PLN")) {
            for (let j = i + 1; j < lines.length; j++) {
                const priceMatch = lines[j].match(priceRegex);
                if (priceMatch) {
                    totalAmount = parseFloat(priceMatch[0].replace(',', '.'));
                    console.log(`[+] Parsed Total Amount: ${totalAmount}`);
                    break;
                }
            }
            break;
        }
    }

    // Fallbacks
    if (!purchaseDate) {
        console.warn("[!] No date found, using current date as fallback");
        purchaseDate = new Date();
    }
    if (!storeName) storeName = "Paragon";

    return { storeName, purchaseDate, items, totalAmount, nip, currency };
  }
}