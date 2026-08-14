import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokenManager } from '../services/api';
import { locationService } from '../services/locationService';
import geofenceService, { GeofenceCheckResult } from '../services/geofenceService';
import socketService from '../services/socketService';
import { logoutUser } from '../hooks/useAuth';
import { FullMapModal } from '../components/FullMapModal';
import { SettingsModal } from '../components/SettingsModal';
import { User, LocationData, NavigationProps } from '../types';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceCheckResult | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processLocationUpdate = (loc: LocationData) => {
    setLocation(loc);
    const result = geofenceService.checkLocationGeofences(loc);
    setGeofenceStatus(result);
    if (result.inDangerZone || result.inRestrictedZone) {
      const warningText = result.warnings[0] || 'You have entered a restricted hazard zone!';
      console.warn('⚠️ GEOFENCE WARNING TRIGGERED:', warningText);
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await tokenManager.getUserData();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    const hasPermission = await locationService.requestLocationPermission();
    if (hasPermission) {
      getCurrentLocation();
    } else {
      Alert.alert(
        t('common.error', 'Permission Required'),
        'This app needs location access for safety monitoring features.'
      );
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await locationService.getCurrentLocation();
      processLocationUpdate(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const toggleLocationTracking = (newValue?: boolean) => {
    const targetState = newValue !== undefined ? newValue : !isTrackingLocation;
    
    if (isTrackingLocation && !targetState) {
      locationService.stopLocationTracking();
      setIsTrackingLocation(false);
      Alert.alert(
        t('dashboard.liveTracking', 'Live Tracking'),
        'Real-time location tracking stopped.',
        [{ text: 'OK' }]
      );
    } else if (!isTrackingLocation && targetState) {
      locationService.startLocationTracking(
        (newLocation) => {
          processLocationUpdate(newLocation);
          socketService.sendLocationUpdate(newLocation);
        },
        (error) => {
          console.error('Location tracking error:', error);
          Alert.alert('Location Error', 'Failed to track location: ' + error.message);
        }
      );
      setIsTrackingLocation(true);
      Alert.alert(
        t('dashboard.trackingOn', 'Live Real-time Tracking ON'), 
        t('dashboard.trackingDesc', 'Tracking enabled. Your live GPS coordinates are being monitored for safety.'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmergency = () => {
    navigation.navigate('Emergency');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await getCurrentLocation();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Top Banner Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greeting}>
              {t('dashboard.greeting', { name: user?.name || 'Tourist' })}
            </Text>
            <Text style={styles.subGreeting}>
              {t('dashboard.subGreeting', 'Stay safe on your journey')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettingsModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Digital ID Card */}
      <View style={styles.digitalIdCard}>
        <Text style={styles.cardTitle}>{t('dashboard.digitalIdCard', 'Digital Tourist ID')}</Text>
        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>{t('dashboard.idLabel', 'ID:')}</Text>
          <Text style={styles.idValue}>{user?.digitalId || 'Loading...'}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewIdButton}
          onPress={() => navigation.navigate('DigitalID')}
        >
          <Text style={styles.viewIdButtonText}>{t('dashboard.viewDetails', 'View Full Details')}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions', 'Quick Actions')}</Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.emergencyButton]}
            onPress={handleEmergency}
          >
            <Text style={styles.emergencyButtonText}>🚨</Text>
            <Text style={styles.actionButtonText}>{t('dashboard.emergency', 'Emergency')}</Text>
          </TouchableOpacity>

          <View style={[styles.actionButton, styles.locationButton, isTrackingLocation && styles.locationButtonActive]}>
            <Text style={styles.locationButtonText}>📍</Text>
            <Text style={styles.actionButtonText}>{t('dashboard.liveTracking', 'Live Tracking')}</Text>
            <View style={styles.switchWrapper}>
              <Switch
                value={isTrackingLocation}
                onValueChange={toggleLocationTracking}
                trackColor={{ false: '#bdc3c7', true: '#2ecc71' }}
                thumbColor={isTrackingLocation ? '#27ae60' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Current Location */}
      <View style={styles.locationCard}>
        <Text style={styles.sectionTitle}>{t('dashboard.currentLocation', 'Current Location')}</Text>

        {location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>{t('dashboard.coordinates', 'Coordinates:')}</Text>
            <Text style={styles.locationValue}>
              {locationService.formatLocation(location)}
            </Text>
            <Text style={styles.locationLabel}>{t('dashboard.lastUpdated', 'Last Updated:')}</Text>
            <Text style={styles.locationValue}>
              {location.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        )}

        <View style={styles.locationButtonRow}>
          <TouchableOpacity
            style={styles.refreshLocationButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.refreshLocationButtonText}>{t('dashboard.updateLocation', '📍 Refresh')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openMapButton}
            onPress={() => setShowMapModal(true)}
          >
            <Text style={styles.openMapButtonText}>{t('dashboard.viewOnMap', '🗺️ Map')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Safety Status & Geofencing */}
      <View style={styles.statusCard}>
        <Text style={styles.sectionTitle}>{t('dashboard.safetyStatus', 'Safety Status & Geofencing')}</Text>
        <View style={styles.statusIndicators}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>
              {location ? '🟢' : '🔴'}
            </Text>
            <Text style={styles.statusText}>
              {t('dashboard.locationStatus', 'Location')}: {location ? t('dashboard.active', 'Active') : t('dashboard.inactive', 'Inactive')}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>
              {isTrackingLocation ? '🟢' : '🟡'}
            </Text>
            <Text style={styles.statusText}>
              {t('dashboard.trackingStatus', 'Tracking')}: {isTrackingLocation ? t('dashboard.on', 'ON') : t('dashboard.off', 'OFF')}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>
              {geofenceStatus?.inDangerZone ? '🚨' : geofenceStatus?.inSafeZone ? '🛡️' : '🗺️'}
            </Text>
            <Text style={styles.statusText}>
              {t('dashboard.geofenceZone', 'Geofence Zone')}: {geofenceStatus?.inDangerZone
                ? t('dashboard.dangerZoneWarning', 'DANGER ZONE WARNING!')
                : geofenceStatus?.inSafeZone
                ? t('dashboard.safeZone', 'Safe Tourist Perimeter')
                : t('dashboard.standardArea', 'Standard Area')}
            </Text>
          </View>
          {geofenceStatus?.nearestDangerZoneName && (
            <View style={styles.statusItem}>
              <Text style={styles.statusIcon}>⚠️</Text>
              <Text style={styles.statusText}>
                {t('dashboard.nearestDanger', 'Nearest Danger Zone')}: {geofenceStatus.nearestDangerZoneName} ({geofenceStatus.distanceToNearestDangerMeters}m {t('dashboard.away', 'away')})
              </Text>
            </View>
          )}
        </View>
      </View>

      <FullMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        location={location}
      />

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onLogout={logoutUser}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subGreeting: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  digitalIdCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  idContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  idLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  idValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
    fontFamily: 'monospace',
  },
  viewIdButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewIdButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 48) / 2 - 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  locationButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#bdc3c7',
  },
  locationButtonActive: {
    borderLeftColor: '#27ae60',
    backgroundColor: '#f4fbf7',
  },
  emergencyButtonText: {
    fontSize: 32,
    marginBottom: 6,
  },
  locationButtonText: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  switchWrapper: {
    marginTop: 2,
  },
  locationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInfo: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  locationButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  refreshLocationButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  refreshLocationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  openMapButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  openMapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    marginBottom: 24,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicators: {
    marginTop: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#2c3e50',
  },
});

export default DashboardScreen;
