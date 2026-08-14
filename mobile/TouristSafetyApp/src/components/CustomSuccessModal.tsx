import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

interface CustomSuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
}

export const CustomSuccessModal: React.FC<CustomSuccessModalProps> = ({
  visible,
  title = 'Registration completed successfully',
  message = 'Please check your registered email for email verification',
  buttonText = 'OK',
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Exact Green Tick Badge matching SweetAlert2 Reference Image */}
              <View style={styles.outerRing}>
                <View style={styles.innerRing}>
                  <Text style={styles.tickSymbol}>✓</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.titleText}>{title}</Text>

              {/* Subtitle Message */}
              {Boolean(message) && <Text style={styles.messageText}>{message}</Text>}

              {/* OK Button */}
              <TouchableOpacity
                style={styles.okButton}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.okButtonText}>{buttonText}</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingTop: 30,
    paddingBottom: 26,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  outerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3.5,
    borderColor: '#5cb85c',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#A5DC86',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tickSymbol: {
    fontSize: 42,
    fontWeight: '900',
    color: '#5cb85c',
    marginTop: -4,
    marginLeft: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '400',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  messageText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  okButton: {
    backgroundColor: '#52B5E6',
    paddingVertical: 10,
    paddingHorizontal: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default CustomSuccessModal;
