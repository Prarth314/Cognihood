
import { Poi } from './types';

export const MOCK_POIS: Poi[] = [
  // Fix: Added required 'cl_rating' property to mock data entries to satisfy the Poi interface
  { id: '1', name: 'Shell Rest Stop', type: 'Rest Area', distance: '1.2 mi', time: '4 min', cl_rating: 'LOW', coordinates: { lat: 34.0522, lng: -118.2437 } },
  { id: '2', name: 'Starbucks Drive-Thru', type: 'Coffee Shop', distance: '2.5 mi', time: '7 min', cl_rating: 'MED', coordinates: { lat: 34.0532, lng: -118.2447 } },
  { id: '3', name: 'Loves Travel Center', type: 'Rest Area', distance: '5.8 mi', time: '12 min', cl_rating: 'LOW', coordinates: { lat: 34.0542, lng: -118.2457 } },
];
