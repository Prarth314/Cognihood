import { TripRecord } from '../types';

const STORAGE_KEY = 'cognihood_archives';

export const storageService = {
  // Save a new trip to the beginning of the list
  saveTrip: (trip: TripRecord): void => {
    try {
      const existingTrips = storageService.getTrips();
      const updatedTrips = [trip, ...existingTrips];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrips));
    } catch (error) {
      console.error("Failed to save trip to storage:", error);
    }
  },

  // Retrieve all trips, return empty array if none found
  getTrips: (): TripRecord[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to fetch trips from storage:", error);
      return [];
    }
  },

  // Calculate stats for the dashboard headers
  calculateGlobalMetrics: () => {
    const trips = storageService.getTrips();
    
    if (trips.length === 0) {
      return { totalHours: "0.0", avgSafety: "0.0", totalIncidents: 0 };
    }

    const totalMinutes = trips.reduce((sum, trip) => sum + trip.durationMinutes, 0);
    const avgSafety = trips.reduce((sum, trip) => sum + trip.avgSafetyIndex, 0) / trips.length;
    const totalIncidents = trips.reduce((sum, trip) => sum + trip.incidentCount, 0);

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      avgSafety: avgSafety.toFixed(1),
      totalIncidents
    };
  }
};
