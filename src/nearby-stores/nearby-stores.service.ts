import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NearbyStoresService {
  private readonly googleMapsApiUrl =
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY')!;
    if (!this.apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined in .env');
    }
  }

  async findNearbyStores(
    location: { lat: number; lng: number },
    categories: string[]
  ): Promise<any[]> {
    try {
      const categoryToPlaceType: { [key: string]: string } = {
        "men's clothing": 'clothing_store',
        "women's clothing": 'clothing_store',
        electronics: 'electronics_store',
        jewelery: 'jewelry_store',
      };

      // Usuwamy domyślny typ 'store' i bierzemy tylko zdefiniowane typy
      const placeTypes = [
        ...new Set(
          categories
            .map((cat) => categoryToPlaceType[cat])
            .filter((type) => type)
        ),
      ];
      console.log('Place types for Google Maps API:', placeTypes);

      if (!placeTypes.length) {
        console.log('No valid place types found for Google Maps API');
        return [];
      }

      const storesSet = new Map<string, any>(); // Używamy Map, aby uniknąć duplikatów na podstawie placeId
      for (const placeType of placeTypes) {
        const response = await axios.get(this.googleMapsApiUrl, {
          params: {
            location: `${location.lat},${location.lng}`,
            radius: 5000,
            type: placeType,
            key: this.apiKey,
          },
        });

        const results = response.data.results || [];
        for (const store of results) {
          const storeData = {
            name: store.name,
            address: store.vicinity,
            location: {
              lat: store.geometry.location.lat,
              lng: store.geometry.location.lng,
            },
            placeId: store.place_id,
            type: placeType,
          };
          // Dodajemy do Map, używając placeId jako klucza
          storesSet.set(store.place_id, storeData);
        }
      }

      const stores = Array.from(storesSet.values());
      console.log('Found stores:', stores);
      return stores;
    } catch (error) {
      console.error(
        `Błąd podczas pobierania pobliskich sklepów z Google Maps API:`,
        error.message
      );
      return [];
    }
  }
}
