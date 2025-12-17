import { CityAdapter } from './types';
import { tokyoCoreAdapter } from './tokyo';

const adapters: Record<string, CityAdapter> = {
    tokyo_core: tokyoCoreAdapter,
};

export function getAdapter(cityId: string): CityAdapter | null {
    return adapters[cityId] || null;
}

export function getAllAdapters(): CityAdapter[] {
    return Object.values(adapters);
}
