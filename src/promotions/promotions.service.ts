import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PromotionsService {
  private readonly apiUrl = 'https://fakestoreapi.com/products';

  async getPromotionsForProduct(productName: string, expectedCategory?: string): Promise<any[]> {
    try {
      const response = await axios.get(this.apiUrl);
      const products = response.data;
      console.log(`Products fetched for "${productName}":`, products.length);

      const filteredProducts = products.filter((product: any) => {
        const matchesName = product.title.toLowerCase().includes(productName.toLowerCase());
        const matchesCategory = expectedCategory
          ? product.category.toLowerCase() === expectedCategory.toLowerCase()
          : true;
        return matchesName && matchesCategory;
      });
      console.log(`Filtered products for "${productName}":`, filteredProducts);

      const promotions = filteredProducts.map((product: any) => {
        const isOnSale = Math.random() > 0.5;
        const discountPercent = isOnSale
          ? product.category === "men's clothing" || product.category === "women's clothing"
            ? 20
            : product.category === "electronics"
            ? 10
            : product.category === "jewelery"
            ? 15
            : 10
          : 0;
        const originalPrice = product.price;
        const salePrice = isOnSale ? originalPrice * (1 - discountPercent / 100) : originalPrice;

        return {
          productName: product.title,
          store: 'Fake Store',
          discount: isOnSale ? `Zniżka ${discountPercent}%` : 'Brak zniżki',
          price: `$${salePrice.toFixed(2)}`,
          originalPrice: `$${originalPrice.toFixed(2)}`,
          link: '',
          image: product.image,
          discountPercent,
          category: product.category, // Dodajemy category do promocji
        };
      });

      console.log(`Promotions for "${productName}":`, promotions);
      return promotions;
    } catch (error) {
      console.error(`Błąd podczas pobierania promocji z Fake Store API:`, error.message);
      return [];
    }
  }

  async getPromotionsForList(items: { name: string; category?: string }[]): Promise<any[]> {
    try {
      const productNames = items.map(item => item.name);
      console.log('Fetching promotions for items:', productNames);

      const allPromotions = await Promise.all(
        items.map(item => this.getPromotionsForProduct(item.name, item.category))
      );

      const promotions = allPromotions.flat();
      console.log('All promotions:', promotions);

      const itemsWithPromotions = items.map(item => {
        const itemPromotions = promotions
          .filter(p => p.productName.toLowerCase().includes(item.name.toLowerCase()))
          .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
          .slice(0, 1);
        return { ...item, promotions: itemPromotions };
      });

      console.log('Items with promotions:', itemsWithPromotions);
      return itemsWithPromotions;
    } catch (error) {
      console.error(`Błąd podczas pobierania promocji dla listy:`, error.message);
      return items.map(item => ({ ...item, promotions: [] }));
    }
  }
}