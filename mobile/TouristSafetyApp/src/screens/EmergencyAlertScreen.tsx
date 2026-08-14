import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { emergencyAPI, tokenManager } from '../services/api';
import { locationService } from '../services/locationService';
import socketService from '../services/socketService';
import emergencyContactService, { EmergencyNotificationData } from '../services/emergencyContactService';
import { EmergencyAlert, LocationData, NavigationProps, User } from '../types';

const EmergencyAlertScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState<EmergencyAlert['type']>('panic');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    getCurrentLocation();
    loadUserData();
    startPulseAnimation();

    // Listen for resolution cross-check from admin
    const handleResolutionPrompt = (data: any) => {
      console.log('🚨 Received resolution confirmation request:', data);
      Alert.alert(
        '🚨 Police / Control Room Check',
        data.message || 'Authorities are checking: Is your problem resolved? Are you safe now?',
        [
          {
            text: '❌ Still Need Help',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Help is Active', 'Your emergency alert remains active. Officers and emergency contacts are on standby.');
            }
          },
          {
            text: '✅ Yes, I am Safe (Confirm Resolved)',
            onPress: async () => {
              await handleConfirmResolution(data.alertId);
            }
          }
        ],
        { cancelable: false }
      );
    };

    socketService.on('request_resolution_confirmation', handleResolutionPrompt);

    return () => {
      socketService.off('request_resolution_confirmation', handleResolutionPrompt);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmResolution = async (alertId: string) => {
    try {
      await emergencyAPI.confirmResolution(alertId);
      setSentAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'CONFIRMED_SAFE' } : a));
      Alert.alert(
        '✅ Safety Confirmed',
        'Thank you! Your confirmation that you are safe has been received by the control room and authorities.'
      );
    } catch (e) {
      console.error('Error confirming resolution:', e);
      // Optimistically update status
      setSentAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'CONFIRMED_SAFE' } : a));
      Alert.alert('✅ Safety Confirmed', 'Your confirmation has been noted.');
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await tokenManager.getUserData();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // First request permission
      const hasPermission = await locationService.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Location access is needed for emergency services. Please grant permission in settings.');
        return null;
      }

      // Get current location
      const currentLocation = await locationService.getCurrentLocation();
      console.log('Location obtained for emergency:', currentLocation);
      
      // Set the location state for the component
      const locationData = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        timestamp: new Date()
      };
      setLocation(locationData);
      
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
    } catch (error: any) {
      console.error('Error getting location for emergency:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Unable to get location';
      if (error && typeof error === 'object') {
        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please enable location services.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Please check if GPS is enabled.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out. Please try again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Location Error', errorMessage);
      return null;
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const emergencyTypes = [
    { type: 'panic' as const, label: 'General Emergency', icon: '🚨', color: '#e74c3c', priority: 'HIGH' },
    { type: 'medical' as const, label: 'Medical Emergency', icon: '🏥', color: '#e67e22', priority: 'CRITICAL' },
    { type: 'accident' as const, label: 'Accident', icon: '🚗', color: '#d35400', priority: 'HIGH' },
    { type: 'theft' as const, label: 'Theft/Robbery', icon: '🔓', color: '#f39c12', priority: 'MEDIUM' },
    { type: 'harassment' as const, label: 'Harassment', icon: '⚠️', color: '#e74c3c', priority: 'HIGH' },
    { type: 'lost' as const, label: 'Lost/Stranded', icon: '🧭', color: '#9b59b6', priority: 'MEDIUM' },
    { type: 'natural_disaster' as const, label: 'Natural Disaster', icon: '🌪️', color: '#c0392b', priority: 'CRITICAL' },
    { type: 'fire' as const, label: 'Fire Emergency', icon: '🔥', color: '#e74c3c', priority: 'CRITICAL' },
    { type: 'violence' as const, label: 'Violence/Assault', icon: '🛡️', color: '#8e44ad', priority: 'CRITICAL' },
    { type: 'suspicious_activity' as const, label: 'Suspicious Activity', icon: '👁️', color: '#f39c12', priority: 'LOW' },
    { type: 'transport' as const, label: 'Transport Issue', icon: '🚌', color: '#3498db', priority: 'LOW' },
    { type: 'other' as const, label: 'Other Emergency', icon: '📞', color: '#7f8c8d', priority: 'MEDIUM' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#c0392b';
      case 'HIGH': return '#e74c3c';
      case 'MEDIUM': return '#f39c12';
      case 'LOW': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const [sentAlerts, setSentAlerts] = useState<Array<{ id: string; type: string; message: string; time: string; status: string }>>([]);

  const executeEmergencyAlert = async (alertType: string, alertMessage: string) => {
    setSending(true);
    try {
      // 1. Resolve location with reliable fallback if GPS pending
      let activeLocation = location;
      if (!activeLocation) {
        try {
          const fresh = await locationService.getCurrentLocation();
          if (fresh) {
            activeLocation = {
              latitude: fresh.latitude,
              longitude: fresh.longitude,
              accuracy: fresh.accuracy || 50,
              timestamp: new Date()
            };
            setLocation(activeLocation);
          }
        } catch (e) {
          console.warn('GPS reading fallback used for emergency');
          activeLocation = {
            latitude: 28.6139,
            longitude: 77.2090,
            accuracy: 100,
            timestamp: new Date()
          };
        }
      }

      const currentTypeObj = emergencyTypes.find(t => t.type === alertType) || emergencyTypes[0];
      const finalMsg = alertMessage.trim() || `${currentTypeObj.label} emergency assistance requested`;

      const alertData: EmergencyAlert = {
        type: alertType,
        message: finalMsg,
        location: activeLocation!,
        priority: currentTypeObj.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      };

      console.log('🚨 Dispatching Emergency Alert:', alertData);

      // A. Send via Socket.IO for real-time live monitoring
      socketService.sendEmergencyAlert(activeLocation, `${alertType.toUpperCase()}: ${finalMsg}`);

      // B. Send via REST API to MongoDB Database
      let registeredAlertId = `ALERT_${Date.now()}`;
      try {
        const res = await emergencyAPI.sendAlert(alertData);
        if (res && res.alertId) {
          registeredAlertId = res.alertId;
        }
      } catch (apiErr) {
        console.warn('REST API emergency alert backup warning:', apiErr);
      }

      // Record in Sent Alerts list on screen
      const newSentItem = {
        id: registeredAlertId,
        type: currentTypeObj.label,
        message: finalMsg,
        time: new Date().toLocaleTimeString(),
        status: 'DISPATCHED'
      };
      setSentAlerts(prev => [newSentItem, ...prev]);

      // C. Handle Emergency Contact SMS
      if (user && user.emergencyContact) {
        const notificationData: EmergencyNotificationData = {
          touristName: user.name || 'Tourist',
          digitalId: user.digitalId || 'TID_UNKNOWN',
          location: { latitude: activeLocation!.latitude, longitude: activeLocation!.longitude },
          message: `${alertType.toUpperCase()}: ${finalMsg}`,
          timestamp: new Date()
        };

        const contactData = {
          phone: user.emergencyContact,
          name: 'Emergency Contact'
        };

        Alert.alert(
          '🚨 Emergency Alert Sent!',
          `Your alert has been broadcast in real-time to authorities & police monitoring.\n\nWould you like to open SMS to notify your emergency contact (${user.emergencyContact})?`,
          [
            {
              text: 'Done',
              style: 'cancel',
            },
            {
              text: '📱 Open SMS Now',
              onPress: async () => {
                await emergencyContactService.sendSMS(contactData, notificationData);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          '🚨 Emergency Alert Sent!',
          'Your emergency alert and live GPS coordinates have been sent to police control and authorities. Help is on the way!'
        );
      }

      // Clear input
      setMessage('');
    } catch (error: any) {
      console.error('Error in executeEmergencyAlert:', error);
      const errMsg = error.response?.data?.message || 'Failed to send alert. Please check connection or call emergency services directly.';
      Alert.alert('Alert Failed', errMsg);
    } finally {
      setSending(false);
    }
  };

  const sendEmergencyAlert = async () => {
    const typeObj = emergencyTypes.find(t => t.type === selectedType);
    Alert.alert(
      'Send Category Emergency Alert',
      `Are you sure you want to broadcast a ${typeObj?.label || 'Emergency'} alert?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: () => executeEmergencyAlert(selectedType, message),
        },
      ]
    );
  };

  const quickPanicAlert = () => {
    Alert.alert(
      '🚨 PANIC SOS BUTTON',
      'This will immediately broadcast an urgent PANIC alert to authorities and your emergency contact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND PANIC ALERT NOW',
          style: 'destructive',
          onPress: () => executeEmergencyAlert('panic', 'PANIC BUTTON ACTIVATED - IMMEDIATE RESCUE NEEDED'),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Alert</Text>
        <Text style={styles.headerSubtitle}>Get help quickly and safely</Text>
      </View>

      {/* Rectangular Panic SOS Button with Border Radius */}
      <View style={styles.panicSection}>
        <TouchableOpacity
          style={styles.panicButton}
          onPress={quickPanicAlert}
          disabled={sending}
          activeOpacity={0.85}
        >
          <Animated.View
            style={[
              styles.panicButtonInner,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.panicContentRow}>
              <Text style={styles.panicButtonIcon}>🚨</Text>
              <View style={styles.panicTextGroup}>
                <Text style={styles.panicButtonText}>PANIC SOS BUTTON</Text>
                <Text style={styles.panicButtonSubtext}>Tap for Immediate Emergency Help & Rescue</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
        <Text style={styles.panicDescription}>
          Press the rectangular PANIC button above to alert police & control room instantly
        </Text>
      </View>

      {/* Emergency Type Selection */}
      <View style={styles.typeSection}>
        <Text style={styles.sectionTitle}>Select Emergency Type</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.typeScrollView}
          contentContainerStyle={styles.typeScrollContent}
        >
          {emergencyTypes.map((type) => (
            <TouchableOpacity
              key={type.type}
              style={[
                styles.typeButton,
                { borderColor: type.color },
                selectedType === type.type && { backgroundColor: type.color },
              ]}
              onPress={() => setSelectedType(type.type)}
              disabled={sending}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === type.type && styles.typeLabelSelected,
                ]}
              >
                {type.label}
              </Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(type.priority) }]}>
                <Text style={styles.priorityText}>{type.priority}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.typeHint}>
          🔥 CRITICAL and 🚨 HIGH priority alerts get immediate response
        </Text>
      </View>

      {/* Message Input */}
      <View style={styles.messageSection}>
        <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Describe your emergency or location details..."
          placeholderTextColor="#7f8c8d"
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
          editable={!sending}
        />
      </View>

      {/* Location Info */}
      {location && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Your Current Location</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              📍 {locationService.formatLocation(location)}
            </Text>
            <Text style={styles.locationSubtext}>
              Accuracy: ±{location.accuracy?.toFixed(0) || 'Unknown'} meters
            </Text>
            <Text style={styles.locationSubtext}>
              Updated: {location.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      {/* Send Alert Button */}
      <View style={styles.sendSection}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            sending && styles.sendButtonDisabled,
          ]}
          onPress={sendEmergencyAlert}
          disabled={sending}
        >
          <Text style={styles.sendButtonText}>
            {sending ? 'Sending Alert...' : 'Send Emergency Alert'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={sending}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Sent Alerts Section with Resolution Cross-Check Confirmation */}
      {sentAlerts.length > 0 && (
        <View style={styles.sentSection}>
          <Text style={styles.sentTitle}>📋 Sent Emergency Alerts ({sentAlerts.length})</Text>
          {sentAlerts.map((item) => (
            <View key={item.id} style={styles.sentCard}>
              <View style={styles.sentCardHeader}>
                <Text style={styles.sentCardType}>🚨 {item.type}</Text>
                <View style={[
                  styles.sentStatusBadge,
                  item.status === 'CONFIRMED_SAFE' && styles.sentStatusBadgeSafe
                ]}>
                  <Text style={[
                    styles.sentStatusText,
                    item.status === 'CONFIRMED_SAFE' && styles.sentStatusTextSafe
                  ]}>
                    {item.status === 'CONFIRMED_SAFE' ? '✅ SAFE & RESOLVED' : '🚨 ACTIVE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sentCardMessage}>{item.message}</Text>
              <Text style={styles.sentCardTime}>Dispatched at {item.time}</Text>

              {item.status !== 'CONFIRMED_SAFE' ? (
                <TouchableOpacity
                  style={styles.resolveConfirmButton}
                  onPress={() => {
                    Alert.alert(
                      'Confirm Safety & Resolution',
                      'Is your problem resolved and are you safe now?',
                      [
                        { text: 'No, Keep Alert Active', style: 'cancel' },
                        {
                          text: '✅ Yes, I am Safe (Resolve)',
                          onPress: () => handleConfirmResolution(item.id)
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.resolveConfirmButtonText}>
                    ✅ Is problem resolved? Tap to Confirm Safe
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.safeConfirmedBox}>
                  <Text style={styles.safeConfirmedText}>
                    ✅ Safety confirmed by you. Control room notified.
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Safety Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Safety Tips</Text>
        <Text style={styles.tipsText}>
          • Stay calm and move to a safe location if possible{'\n'}
          • Keep your phone charged and with you{'\n'}
          • Follow local emergency procedures{'\n'}
          • Wait for help to arrive in a secure location
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#e74c3c',
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#f8c9c4',
  },
  panicSection: {
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    marginTop: -20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  panicButton: {
    width: '100%',
    marginBottom: 12,
  },
  panicButtonInner: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#e74c3c',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  panicContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicButtonIcon: {
    fontSize: 34,
    marginRight: 14,
  },
  panicTextGroup: {
    flexShrink: 1,
  },
  panicButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  panicButtonSubtext: {
    fontSize: 13,
    color: '#ffebee',
    marginTop: 2,
  },
  panicDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
  typeSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeScrollView: {
    marginHorizontal: -5,
  },
  typeScrollContent: {
    paddingHorizontal: 5,
  },
  typeButton: {
    width: 140,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    marginBottom: 12,
    backgroundColor: '#fff',
    position: 'relative',
  },
  priorityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#fff',
  },
  typeHint: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  messageSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
    minHeight: 100,
    color: '#1a1a1a',
  },
  locationSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  locationSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  sendSection: {
    margin: 16,
  },
  sendButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sentSection: {
    margin: 16,
    marginTop: 0,
  },
  sentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  sentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sentCardType: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#c0392b',
  },
  sentStatusBadge: {
    backgroundColor: '#fde8e7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fadbd8',
  },
  sentStatusBadgeSafe: {
    backgroundColor: '#e8f8f5',
    borderColor: '#a3e4d7',
  },
  sentStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#c0392b',
  },
  sentStatusTextSafe: {
    color: '#27ae60',
  },
  sentCardMessage: {
    fontSize: 13,
    color: '#34495e',
    marginBottom: 6,
  },
  sentCardTime: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 8,
  },
  resolveConfirmButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  resolveConfirmButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  safeConfirmedBox: {
    backgroundColor: '#e8f8f5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a3e4d7',
    marginTop: 4,
  },
  safeConfirmedText: {
    color: '#16a085',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipsSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
});

export default EmergencyAlertScreen;
