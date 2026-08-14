import { Alert, Linking } from 'react-native';

export interface EmergencyContactData {
  name?: string;
  phone: string;
  relation?: string;
}

export interface EmergencyNotificationData {
  touristName: string;
  digitalId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  message: string;
  timestamp: Date;
}

class EmergencyContactService {
  /**
   * Send SMS to emergency contact with enhanced debugging and emulator support
   */
  async sendSMS(contact: EmergencyContactData, data: EmergencyNotificationData): Promise<boolean> {
    try {
      console.log('🔍 Starting SMS send process...');
      console.log('📞 Contact:', contact);
      console.log('📍 Emergency data:', data);

      const locationText = `${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}`;
      const googleMapsUrl = `https://maps.google.com/?q=${data.location.latitude},${data.location.longitude}`;
      
      const smsBody = `🚨 EMERGENCY ALERT 🚨\n` +
        `${data.touristName} (ID: ${data.digitalId}) needs immediate help!\n` +
        `Alert: ${data.message}\n` +
        `Location: ${locationText}\n` +
        `Map: ${googleMapsUrl}\n` +
        `Time: ${data.timestamp.toLocaleString()}\n` +
        `- Sent from RakshaSetu Tourist Safety System`;

      const phoneNumber = (contact.phone || '').replace(/\D/g, '');
      const encodedBody = encodeURIComponent(smsBody);
      
      // On Android and iOS, different SMS apps respond to different URI schemes
      const urlsToTry = [
        `sms:${phoneNumber}?body=${encodedBody}`,
        `smsto:${phoneNumber}?body=${encodedBody}`,
        `sms:${phoneNumber}&body=${encodedBody}`,
        `sms:${phoneNumber}`
      ];

      for (const url of urlsToTry) {
        try {
          await Linking.openURL(url);
          console.log('✅ SMS app opened successfully via:', url);
          return true;
        } catch (err) {
          console.log('Trying next SMS URL scheme, failed for:', url);
        }
      }

      // If all URL schemes failed, show manual test dialog
      this.testSMSFunctionality(contact, data);
      return false;
    } catch (error: any) {
      console.error('❌ Error sending SMS:', error);
      this.testSMSFunctionality(contact, data);
      return false;
    }
  }

  /**
   * Test SMS functionality - shows what would be sent
   */
  testSMSFunctionality(contact: EmergencyContactData, data: EmergencyNotificationData) {
    const locationText = `${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}`;
    const googleMapsUrl = `https://maps.google.com/?q=${data.location.latitude},${data.location.longitude}`;
    
    const smsBody = `🚨 EMERGENCY ALERT 🚨\n\n` +
      `${data.touristName} (ID: ${data.digitalId}) needs help!\n\n` +
      `Message: ${data.message}\n\n` +
      `Location: ${locationText}\n` +
      `Map: ${googleMapsUrl}\n\n` +
      `Time: ${data.timestamp.toLocaleString()}`;

    Alert.alert(
      '📱 Emergency SMS Prepared',
      `Recipient: ${contact.phone}\n\n${smsBody}`,
      [
        { text: 'OK' }
      ]
    );
  }

  /**
   * Call emergency contact
   */
  async callEmergencyContact(contact: EmergencyContactData): Promise<boolean> {
    try {
      const phoneNumber = (contact.phone || '').replace(/\D/g, '');
      const phoneUrl = `tel:${phoneNumber}`;

      await Linking.openURL(phoneUrl);
      return true;
    } catch (error) {
      console.error('Error calling emergency contact:', error);
      Alert.alert('Call Error', `Unable to open phone dialer for ${contact.phone}`);
      return false;
    }
  }

  /**
   * Show emergency contact options dialog
   */
  showEmergencyContactDialog(contact: EmergencyContactData, notificationData?: EmergencyNotificationData) {
    const contactName = contact.name || 'Emergency Contact';
    const contactInfo = contact.relation ? `${contactName} (${contact.relation})` : contactName;
    
    Alert.alert(
      'Emergency Contact',
      `${contactInfo}\nPhone: ${contact.phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'default',
          onPress: () => this.callEmergencyContact(contact),
        },
        ...(notificationData ? [{
          text: 'Send SMS Alert',
          style: 'destructive' as const,
          onPress: () => this.sendSMS(contact, notificationData),
        }] : []),
      ]
    );
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    }
    return phone;
  }
}

export const emergencyContactService = new EmergencyContactService();
export default emergencyContactService;
