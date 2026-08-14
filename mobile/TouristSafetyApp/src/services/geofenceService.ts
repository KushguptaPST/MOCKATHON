import { LocationData } from '../types';
import api from './api';

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'SAFE' | 'DANGER' | 'RESTRICTED';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description: string;
  warningMessage?: string;
}

export interface GeofenceCheckResult {
  currentZone: GeofenceZone | null;
  inDangerZone: boolean;
  inSafeZone: boolean;
  inRestrictedZone: boolean;
  warnings: string[];
  distanceToNearestDangerMeters: number | null;
  nearestDangerZoneName: string | null;
}

// Pre-defined sample zones (fallback if offline)
export const DEFAULT_GEOFENCE_ZONES: GeofenceZone[] = [
  {
    id: 'safe-zone-center',
    name: 'Tourist City Center & Help Hub',
    type: 'SAFE',
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 5000,
    description: 'Main monitored safe tourist zone with law enforcement & medical coverage.',
  },
  {
    id: 'danger-zone-1',
    name: 'High-Risk Landslide Hazard Area',
    type: 'DANGER',
    latitude: 28.6300,
    longitude: 77.2200,
    radiusMeters: 1200,
    description: 'IMD Alert: Unstable slope terrain with active rockfalls.',
    warningMessage: '⚠️ WARNING: You have entered a High-Risk Landslide Zone! Please turn back or stay alert.',
  },
  {
    id: 'restricted-zone-1',
    name: 'Restricted Border / Forest Reserve',
    type: 'RESTRICTED',
    latitude: 28.5800,
    longitude: 77.1800,
    radiusMeters: 1500,
    description: 'Restricted ecological reserve. Unauthorized entry prohibited after dark.',
    warningMessage: '🚨 ALERT: You are near a Restricted Reserve Zone. Entry requires local authorization.',
  }
];

class GeofenceService {
  private zones: GeofenceZone[] = [...DEFAULT_GEOFENCE_ZONES];

  public getZones(): GeofenceZone[] {
    return this.zones;
  }

  public setZones(newZones: GeofenceZone[]): void {
    this.zones = newZones;
  }

  public addZone(zone: GeofenceZone): void {
    this.zones.push(zone);
  }

  /**
   * Fetches dynamic hazard & safe geofences from backend API
   */
  public async fetchGeofencesFromBackend(): Promise<GeofenceZone[]> {
    try {
      const response = await api.get('/geofences');
      if (response.data && response.data.zones && response.data.zones.length > 0) {
        const backendZones: GeofenceZone[] = response.data.zones.map((z: any) => ({
          id: z._id || z.id,
          name: z.name,
          type: z.type,
          latitude: z.latitude,
          longitude: z.longitude,
          radiusMeters: z.radiusMeters,
          description: z.description,
          warningMessage: z.warningMessage
        }));
        this.zones = backendZones;
        return backendZones;
      }
    } catch (err) {
      console.warn('Could not fetch backend geofences, using default fallback zones:', err);
    }
    return this.zones;
  }

  /**
   * Calculate distance between 2 coordinates in meters (Haversine formula)
   */
  public calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Evaluates location against all active Geofences
   */
  public checkLocationGeofences(location: LocationData): GeofenceCheckResult {
    let currentZone: GeofenceZone | null = null;
    let inDangerZone = false;
    let inSafeZone = false;
    let inRestrictedZone = false;
    const warnings: string[] = [];
    let minDangerDistance: number | null = null;
    let nearestDangerName: string | null = null;

    for (const zone of this.zones) {
      const distance = this.calculateDistanceMeters(
        location.latitude,
        location.longitude,
        zone.latitude,
        zone.longitude
      );

      if (zone.type === 'DANGER' || zone.type === 'RESTRICTED') {
        if (minDangerDistance === null || distance < minDangerDistance) {
          minDangerDistance = Math.round(distance);
          nearestDangerName = zone.name;
        }
      }

      if (distance <= zone.radiusMeters) {
        currentZone = zone;
        if (zone.type === 'DANGER') {
          inDangerZone = true;
          if (zone.warningMessage) warnings.push(zone.warningMessage);
        } else if (zone.type === 'RESTRICTED') {
          inRestrictedZone = true;
          if (zone.warningMessage) warnings.push(zone.warningMessage);
        } else if (zone.type === 'SAFE') {
          inSafeZone = true;
        }
      }
    }

    return {
      currentZone,
      inDangerZone,
      inSafeZone,
      inRestrictedZone,
      warnings,
      distanceToNearestDangerMeters: minDangerDistance,
      nearestDangerZoneName: nearestDangerName,
    };
  }
}

export const geofenceService = new GeofenceService();
export default geofenceService;
