const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && !accountSid.includes('your_') && !authToken.includes('your_')) {
  try {
    if (accountSid.startsWith('AC')) {
      client = twilio(accountSid, authToken);
      console.log('✅ Twilio Client successfully initialized for Emergency SMS dispatch.');
    } else {
      console.log('ℹ️ Twilio API Key detected. Emergency SMS will be safely simulated/logged.');
    }
  } catch (err) {
    console.warn('⚠️ Twilio initialization warning:', err.message);
  }
} else {
  console.log('ℹ️ Twilio credentials not configured or placeholder detected. Emergency SMS will be logged to console.');
}

/**
 * Dispatches Emergency SOS SMS via Twilio to emergency contacts or emergency helpline.
 */
exports.sendEmergencySMS = async ({ toPhone, touristName, digitalId, latitude, longitude, emergencyType }) => {
  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  const messageBody = `🚨 RAKSHAKSETU SOS EMERGENCY ALERT!\nTourist: ${touristName || 'Registered Tourist'} (ID: ${digitalId || 'N/A'})\nType: ${emergencyType || 'PANIC SOS'}\nLocation: ${mapsUrl}\nImmediate assistance required!`;

  if (!toPhone) {
    console.log('ℹ️ No emergency contact phone specified for SMS dispatch.');
    return { success: false, reason: 'No destination phone number' };
  }

  if (client && fromPhone) {
    try {
      const response = await client.messages.create({
        body: messageBody,
        from: fromPhone,
        to: toPhone,
      });
      console.log(`✅ Twilio Emergency SMS sent successfully to ${toPhone}. SID: ${response.sid}`);
      return { success: true, sid: response.sid };
    } catch (error) {
      console.error(`❌ Failed to send Twilio Emergency SMS to ${toPhone}:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    console.log(`📱 [SIMULATED TWILIO EMERGENCY SMS to ${toPhone}]:\n${messageBody}`);
    return { success: true, simulated: true };
  }
};
