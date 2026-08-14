import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LocationData } from '../types';
import geofenceService, { GeofenceZone } from '../services/geofenceService';

interface FullMapModalProps {
  visible: boolean;
  onClose: () => void;
  location: LocationData | null;
  geofenceZones?: GeofenceZone[];
}

export const FullMapModal: React.FC<FullMapModalProps> = ({
  visible,
  onClose,
  location,
  geofenceZones,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [activeZones, setActiveZones] = useState<GeofenceZone[]>(geofenceZones || geofenceService.getZones());

  const initialLat = location?.latitude || 28.6139;
  const initialLng = location?.longitude || 77.2090;

  useEffect(() => {
    if (visible) {
      loadLiveBackendZones();
    }
  }, [visible]);

  const loadLiveBackendZones = async () => {
    try {
      const fetchedZones = await geofenceService.fetchGeofencesFromBackend();
      if (fetchedZones && fetchedZones.length > 0) {
        setActiveZones(fetchedZones);
      }
    } catch (e) {
      console.warn('Failed to load backend geofences:', e);
    }
  };

  useEffect(() => {
    if (visible && location && webViewRef.current) {
      const jsCode = `if(typeof updateUserLocation === 'function'){ updateUserLocation(${location.latitude}, ${location.longitude}); }`;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [visible, location]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CLOSE_MAP') {
        onClose();
      } else if (data.type === 'START_NAV' && data.lat && data.lng) {
        const lat = data.lat;
        const lng = data.lng;
        const googleNavUrl = Platform.OS === 'android'
          ? `google.navigation:q=${lat},${lng}`
          : `https://maps.apple.com/?daddr=${lat},${lng}`;
        
        Linking.canOpenURL(googleNavUrl).then((supported) => {
          if (supported) {
            Linking.openURL(googleNavUrl);
          } else {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
          }
        });
      }
    } catch (e) {
      console.error('Error handling webview message:', e);
    }
  };

  const generateMapHtml = (lat: number, lng: number) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #eef2f5; }
        
        /* Floating Search Bar with Back Arrow on Right Side */
        #search-box {
          position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000;
          display: flex; align-items: center; background: white; border-radius: 28px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18); padding: 4px 16px; height: 46px;
        }
        .search-icon { font-size: 16px; margin-right: 8px; color: #7f8c8d; }
        #search-input {
          flex: 1; border: none; font-size: 15px; outline: none; color: #1a1a1a; background: transparent;
        }
        .clear-btn { font-size: 16px; color: #95a5a6; cursor: pointer; padding: 4px; display: none; margin-right: 8px; }
        
        /* Clean Back Navigation Icon on Right (No Red Box) */
        .back-icon-right {
          font-size: 22px; font-weight: bold; color: #2c3e50; cursor: pointer;
          padding: 4px 8px; display: flex; align-items: center; justify-content: center;
          border-left: 1px solid #e0e0e0; margin-left: 6px; padding-left: 10px;
        }
        .back-icon-right:active { opacity: 0.5; }
        
        /* Search Autocomplete Results Dropdown */
        #search-results {
          position: absolute; top: 66px; left: 12px; right: 12px; z-index: 1000;
          background: white; border-radius: 12px; max-height: 220px; overflow-y: auto;
          box-shadow: 0 6px 18px rgba(0,0,0,0.2); display: none;
        }
        #search-results div {
          padding: 12px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #2c3e50; cursor: pointer;
        }
        #search-results div:last-child { border-bottom: none; }
        #search-results div:active { background: #f7f9fa; }

        /* Floating Destination Info Card */
        #destination-card {
          position: absolute; bottom: 85px; left: 12px; right: 12px; z-index: 1000;
          background: white; border-radius: 16px; padding: 14px 16px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25); display: none; border-left: 5px solid #007AFF;
        }
        .dest-title { font-size: 14px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px; line-height: 18px; }
        .dest-distance { font-size: 13px; font-weight: 600; color: #007AFF; margin-bottom: 8px; }
        .dest-actions { display: flex; gap: 8px; margin-top: 8px; }
        .nav-btn {
          flex: 1; background: #007AFF; color: white; border: none; padding: 10px;
          border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .route-btn {
          flex: 1; background: #27ae60; color: white; border: none; padding: 10px;
          border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 4px;
        }

        /* Detect My Location Floating Button */
        .my-location-btn {
          position: absolute; bottom: 24px; left: 12px; z-index: 1000;
          background: #007AFF; color: white; border: none; padding: 12px 20px;
          border-radius: 25px; font-weight: bold; font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,122,255,0.4); cursor: pointer; display: flex; align-items: center; gap: 6px;
        }

        .custom-user-marker { background: #007AFF; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(0,122,255,0.8); }
        .custom-dest-marker { background: #e74c3c; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(231,76,60,0.8); }
      </style>
    </head>
    <body>
      <div id="search-box">
        <span class="search-icon">🔍</span>
        <input id="search-input" type="text" placeholder="Search here..." autocomplete="off" />
        <span class="clear-btn" id="clear-btn">✕</span>
        <span class="back-icon-right" onclick="exitMapModal()" title="Back">←</span>
      </div>
      <div id="search-results"></div>

      <div id="destination-card">
        <div class="dest-title" id="dest-name">Destination</div>
        <div class="dest-distance" id="dest-distance">📍 Calculating road route...</div>
        <div class="dest-actions">
          <button class="route-btn" onclick="drawRoadRoute()">🧭 Road Route</button>
          <button class="nav-btn" onclick="startGoogleNavigation()">🚀 Start Navigation</button>
        </div>
      </div>

      <button class="my-location-btn" onclick="detectUserLocation()">🎯 My Location</button>

      <div id="map"></div>

      <script>
        var userLat = ${lat};
        var userLng = ${lng};
        var currentDestLat = null;
        var currentDestLng = null;
        var currentDestName = '';

        var map = L.map('map', { zoomControl: false }).setView([userLat, userLng], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        var userIcon = L.divIcon({
          className: 'custom-user-marker',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        var userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
          .bindPopup('<b>📍 Your Current Location</b>');

        var searchMarker = null;
        var routePolyline = null;

        // Render Geofence Hazard & Safe Zones dynamically
        var zones = ${JSON.stringify(activeZones)};
        zones.forEach(function(zone) {
          var color = zone.type === 'DANGER' ? '#e74c3c' : zone.type === 'RESTRICTED' ? '#f39c12' : '#27ae60';
          var typeBadge = zone.type === 'DANGER' ? '🚨 HIGH RISK DANGER' : zone.type === 'RESTRICTED' ? '⛔ RESTRICTED ZONE' : '🟢 SAFE ZONE';
          
          L.circle([zone.latitude, zone.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2,
            radius: zone.radiusMeters
          }).addTo(map).bindPopup('<b>' + typeBadge + '</b><br><b>' + zone.name + '</b><br>' + zone.description);
        });

        function updateUserLocation(newLat, newLng) {
          userLat = newLat;
          userLng = newLng;
          userMarker.setLatLng([newLat, newLng]);
        }

        function detectUserLocation() {
          map.setView([userLat, userLng], 15);
          userMarker.openPopup();
        }

        function exitMapModal() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLOSE_MAP' }));
        }

        // --- HAVERSINE DISTANCE FORMULA ---
        function calculateHaversineKm(lat1, lon1, lat2, lon2) {
          var R = 6371; // Earth radius in km
          var dLat = (lat2 - lat1) * Math.PI / 180;
          var dLon = (lon2 - lon1) * Math.PI / 180;
          var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }

        // --- OSRM ROAD ROUTING API ---
        async function fetchRoadRoute(lat1, lon1, lat2, lon2) {
          var url = 'https://router.project-osrm.org/route/v1/driving/' + lon1 + ',' + lat1 + ';' + lon2 + ',' + lat2 + '?overview=full&geometries=geojson';
          try {
            var res = await fetch(url);
            var data = await res.json();
            if (data.routes && data.routes.length > 0) {
              var route = data.routes[0];
              var coords = route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              var durationMins = Math.round(route.duration / 60);
              var distKm = (route.distance / 1000).toFixed(1);
              return { coords: coords, durationMins: durationMins, distKm: distKm };
            }
          } catch (e) {
            console.error('OSRM route error:', e);
          }
          return null;
        }

        // --- SEARCH & AUTOCOMPLETE ---
        var input = document.getElementById('search-input');
        var resultsBox = document.getElementById('search-results');
        var clearBtn = document.getElementById('clear-btn');
        var destCard = document.getElementById('destination-card');
        var debounceTimer;

        clearBtn.addEventListener('click', function() {
          input.value = '';
          clearBtn.style.display = 'none';
          resultsBox.style.display = 'none';
          destCard.style.display = 'none';
          if (searchMarker) map.removeLayer(searchMarker);
          if (routePolyline) map.removeLayer(routePolyline);
          map.setView([userLat, userLng], 14);
        });

        input.addEventListener('input', function() {
          clearTimeout(debounceTimer);
          var query = input.value.trim();
          if (query.length > 0) {
            clearBtn.style.display = 'block';
          } else {
            clearBtn.style.display = 'none';
          }

          if (query.length < 3) {
            resultsBox.style.display = 'none';
            return;
          }
          debounceTimer = setTimeout(function() { searchPlace(query); }, 400);
        });

        async function searchPlace(query) {
          var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=5';
          try {
            var res = await fetch(url, {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'RakshaSetuApp/1.0'
              }
            });
            var data = await res.json();
            showResults(data);
          } catch (err) {
            console.error('Search failed:', err);
          }
        }

        function showResults(results) {
          resultsBox.innerHTML = '';
          if (!results || results.length === 0) {
            resultsBox.style.display = 'none';
            return;
          }
          results.forEach(function(place) {
            var item = document.createElement('div');
            item.textContent = place.display_name;
            item.addEventListener('click', function() { selectPlace(place); });
            resultsBox.appendChild(item);
          });
          resultsBox.style.display = 'block';
        }

        async function selectPlace(place) {
          currentDestLat = parseFloat(place.lat);
          currentDestLng = parseFloat(place.lon);
          currentDestName = place.display_name;

          document.getElementById('dest-name').textContent = currentDestName;
          document.getElementById('dest-distance').textContent = '🚗 Fetching road directions...';
          destCard.style.display = 'block';

          // Fetch OSRM Road Route
          var routeData = await fetchRoadRoute(userLat, userLng, currentDestLat, currentDestLng);
          
          if (routePolyline) map.removeLayer(routePolyline);

          if (routeData && routeData.coords.length > 0) {
            document.getElementById('dest-distance').textContent = '🚗 ' + routeData.durationMins + ' mins (' + routeData.distKm + ' km via roads)';
            routePolyline = L.polyline(routeData.coords, {
              color: '#007AFF',
              weight: 5,
              opacity: 0.95
            }).addTo(map);
          } else {
            // Fallback to Haversine straight line
            var distKm = calculateHaversineKm(userLat, userLng, currentDestLat, currentDestLng);
            var distText = distKm < 1 ? (distKm * 1000).toFixed(0) + ' m' : distKm.toFixed(1) + ' km';
            document.getElementById('dest-distance').textContent = '📍 ' + distText + ' away from your current location';
            
            routePolyline = L.polyline([[userLat, userLng], [currentDestLat, currentDestLng]], {
              color: '#007AFF',
              weight: 4,
              dashArray: '6, 8',
              opacity: 0.8
            }).addTo(map);
          }

          // Create Destination Marker
          if (searchMarker) map.removeLayer(searchMarker);
          var destIcon = L.divIcon({
            className: 'custom-dest-marker',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });

          searchMarker = L.marker([currentDestLat, currentDestLng], { icon: destIcon }).addTo(map)
            .bindPopup('<b>' + currentDestName + '</b>')
            .openPopup();

          // Fit map bounds to show route
          var bounds = L.latLngBounds([[userLat, userLng], [currentDestLat, currentDestLng]]);
          map.fitBounds(bounds, { padding: [60, 60] });

          resultsBox.style.display = 'none';
          input.value = currentDestName.split(',')[0];
        }

        function drawRoadRoute() {
          if (currentDestLat && currentDestLng) {
            selectPlace({ lat: currentDestLat, lon: currentDestLng, display_name: currentDestName });
          }
        }

        function startGoogleNavigation() {
          if (currentDestLat && currentDestLng) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'START_NAV',
              lat: currentDestLat,
              lng: currentDestLng,
              name: currentDestName
            }));
          }
        }
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
        
        {/* Fullscreen Map View */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: generateMapHtml(initialLat, initialLng) }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMessage}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    flex: 1,
  },
});

export default FullMapModal;
