import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { User } from '../types';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  user,
  onLogout,
}) => {
  const { t, i18n } = useTranslation();

  const handleLanguageSelect = async (code: string) => {
    await setAppLanguage(code);
  };

  const confirmLogout = () => {
    onClose();
    Alert.alert(
      t('common.logout', 'Logout'),
      t('common.logoutConfirm', 'Are you sure you want to log out of RakshaSetu?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.logout', 'Logout'),
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>⚙️ {t('settings.title', 'Settings & Preferences')}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* User Profile Summary */}
              {user && (
                <View style={styles.userCard}>
                  <Text style={styles.userName}>{user.name || 'Tourist'}</Text>
                  <Text style={styles.userId}>
                    {t('settings.digitalId', 'Digital ID:')} <Text style={styles.userIdBold}>{user.digitalId || 'N/A'}</Text>
                  </Text>
                  <Text style={styles.userEmail}>{user.email || ''}</Text>
                </View>
              )}

              {/* Language Selection Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🌐 {t('settings.language', 'App Language')}</Text>
                <Text style={styles.sectionSubtitle}>
                  {t('settings.selectLanguage', 'Select your preferred language')}
                </Text>
              </View>

              {/* Scrollable Language List */}
              <ScrollView
                style={styles.languageScrollView}
                contentContainerStyle={styles.languageList}
                showsVerticalScrollIndicator={true}
              >
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = i18n.language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageOption,
                        isSelected && styles.languageOptionSelected,
                      ]}
                      onPress={() => handleLanguageSelect(lang.code)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.languageLeft}>
                        <Text style={styles.languageFlag}>{lang.flag}</Text>
                        <View style={styles.languageInfo}>
                          <Text
                            style={[
                              styles.languageLabel,
                              isSelected && styles.languageLabelSelected,
                            ]}
                          >
                            {lang.nativeName} {lang.nativeName !== lang.name ? `(${lang.name})` : ''}
                          </Text>
                          <Text style={styles.languageSubtitle}>📍 {lang.region}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Logout Option */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>
                  {t('settings.logout', '🚪 Logout from App')}
                </Text>
              </TouchableOpacity>

              {/* Footer */}
              <Text style={styles.versionText}>
                {t('settings.version', 'RakshaSetu v1.0.0 (Secure)')}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f2f6',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  userCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  userId: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  userIdBold: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  userEmail: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  languageScrollView: {
    maxHeight: 250,
    marginBottom: 14,
  },
  languageList: {
    gap: 6,
    paddingVertical: 2,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  languageOptionSelected: {
    borderColor: '#3498db',
    backgroundColor: '#ebf5fb',
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageInfo: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
  },
  languageLabelSelected: {
    color: '#2980b9',
    fontWeight: 'bold',
  },
  languageSubtitle: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#bdc3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircleSelected: {
    borderColor: '#3498db',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
  },
  logoutButton: {
    backgroundColor: '#fdedec',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fadbd8',
    marginBottom: 8,
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 10,
    color: '#bdc3c7',
    textAlign: 'center',
  },
});

export default SettingsModal;
