import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getServerUrl, setServerUrl, DEFAULT_SERVER_URL } from '../services/api';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const [serverUrl, setServerUrlInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrentUrl();
    }
  }, [visible]);

  const loadCurrentUrl = async () => {
    const current = await getServerUrl();
    setServerUrlInput(current);
  };

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid backend server URL (e.g. http://192.168.1.67:5002)');
      return;
    }

    setTesting(true);
    try {
      let clean = serverUrl.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      if (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
      }

      // The backend exposes its health endpoint under /api.
      const response = await fetch(`${clean}/api/health`, { method: 'GET' });
      if (response.ok) {
        await setServerUrl(clean);
        Alert.alert('Server Connected', `Successfully connected to backend server:\n${clean}`);
        if (onSaved) onSaved(clean);
        onClose();
      } else {
        Alert.alert('Connection Warning', `Server responded with status ${response.status}. Saving URL anyway.`);
        await setServerUrl(clean);
        if (onSaved) onSaved(clean);
        onClose();
      }
    } catch (err: any) {
      Alert.alert(
        'Server Saved',
        `Backend server set to:\n${serverUrl}\n\nNote: Unable to reach server immediately. Please verify phone is on same Wi-Fi as Mac.`
      );
      let clean = serverUrl.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      await setServerUrl(clean);
      if (onSaved) onSaved(clean);
      onClose();
    } finally {
      setTesting(false);
    }
  };

  const resetToDefault = async () => {
    setServerUrlInput(DEFAULT_SERVER_URL);
    await setServerUrl(DEFAULT_SERVER_URL);
    Alert.alert('Reset to Default', `Reset server URL to default:\n${DEFAULT_SERVER_URL}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>⚙️ Backend Server IP</Text>
          <Text style={styles.subtitle}>
            If you get Network Error on your phone, make sure your phone and laptop are on the same Wi-Fi network and enter your laptop IP below:
          </Text>

          <Text style={styles.label}>Server Base URL:</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrlInput}
            placeholder="http://192.168.1.67:5002"
            placeholderTextColor="#7f8c8d"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.presetsTitle}>Quick Presets:</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setServerUrlInput('https://tax-firefox-journey-ringtone.trycloudflare.com')}
            >
              <Text style={styles.presetChipText}>🌐 Cloudflare Tunnel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setServerUrlInput('http://192.168.1.67:5002')}
            >
              <Text style={styles.presetChipText}>🏠 Local Wi-Fi</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.resetButton} onPress={resetToDefault}>
              <Text style={styles.resetButtonText}>Reset Default</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={testing}>
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: '#ebf5fb',
    borderWidth: 1,
    borderColor: '#aed6f1',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2980b9',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default ServerConfigModal;
