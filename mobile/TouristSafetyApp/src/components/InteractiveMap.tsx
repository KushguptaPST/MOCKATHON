import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LocationData } from '../types';
import { GeofenceZone, DEFAULT_GEOFENCE_ZONES } from '../services/geofenceService';

interface InteractiveMapProps {
  location: LocationData | null;
  geofenceZones?: GeofenceZone[];
  height?: number;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  location,
  geofenceZones = DEFAULT_GEOFENCE_ZONES,
  height = 320,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const initialLat = location?.latitude || 28.6139;
  const initialLng = location?.longitude || 77.2090;

  const generateMapHtml = (lat: number, lng: number) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; font-family: sans-serif; }
        .leaflet-popup-content-wrapper { border-radius: 8px; font-size: 13px; }
        .user-pin { background: #007AFF; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(0,122,255,0.6); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}], [${lng}], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // User Marker
        var userMarker = L.marker([${lat}], [${lng}]).addTo(map)
          .bindPopup('<b>📍 Your Location</b><br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}')
          .openPopup();

        // Search Marker Layer
        var searchMarker = null;

        // Render Geofence Zones
        var zones = ${JSON.stringify(geofenceZones)};
        zones.forEach(function(zone) {
          var color = zone.type === 'DANGER' ? '#e74c3c' : zone.type === 'RESTRICTED' ? '#f39c12' : '#27ae60';
          L.circle([zone.latitude, zone.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            radius: zone.radiusMeters
          }).addTo(map).bindPopup('<b>' + zone.name + '</b><br>' + zone.description);
        });

        // Function to update user location
        function updateUserLocation(newLat, newLng) {
          userMarker.setLatLng([newLat, newLng]);
          map.panTo([newLat, newLng]);
        }

        // Function to show searched location
        function showSearchLocation(searchLat, searchLng, label) {
          if (searchMarker) {
            map.removeLayer(searchMarker);
          }
          searchMarker = L.marker([searchLat, searchLng]).addTo(map)
            .bindPopup('<b>🔍 Search Result</b><br>' + label)
            .openPopup();
          map.setView([searchLat, searchLng], 15);
        }
      </script>
    </body>
    </html>
  `;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const searchLat = parseFloat(result.lat);
        const searchLng = parseFloat(result.lon);
        const label = result.display_name;

        // Execute JS in WebView to update search marker & pan map
        const jsCode = `showSearchLocation(${searchLat}, ${searchLng}, '${label.replace(/'/g, "\\'")}');`;
        webViewRef.current?.injectJavaScript(jsCode);
      } else {
        Alert.alert('Location Not Found', 'No results found for "' + searchQuery + '". Please try another search.');
      }
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert('Search Error', 'Failed to search location. Please check your network connection.');
    } finally {
      setSearching(false);
    }
  };

  const recenterToUser = () => {
    if (location) {
      const jsCode = `updateUserLocation(${location.latitude}, ${location.longitude});`;
      webViewRef.current?.injectJavaScript(jsCode);
    } else {
      Alert.alert('Location Unavailable', 'GPS location is currently updating...');
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search any place or location..."
          placeholderTextColor="#7f8c8d"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>🔍 Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Embedded Map */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateMapHtml(initialLat, initialLng) }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Recenter Button Overlay */}
      <TouchableOpacity style={styles.recenterButton} onPress={recenterToUser}>
        <Text style={styles.recenterButtonText}>🎯 My Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eef2f5',
    position: 'relative',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchBarContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  recenterButtonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default InteractiveMap;
