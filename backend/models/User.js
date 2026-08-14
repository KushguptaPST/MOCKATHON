const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  role: {
    type: String,
    enum: ['tourist', 'admin', 'authority'],
    default: 'tourist'
  },
  digitalId: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String
  }],
  lastLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    timestamp: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

UserSchema.virtual('emergencyContact').get(function() {
  if (this.emergencyContacts && this.emergencyContacts.length > 0) {
    return this.emergencyContacts[0].phone || this.emergencyContacts[0].name || '';
  }
  return '';
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // Generate Digital ID if not present
  if (!this.digitalId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.digitalId = `${this.role.charAt(0).toUpperCase()}ID${timestamp}${random}`;
  }
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Backwards compatibility method for routes using comparePassword
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
