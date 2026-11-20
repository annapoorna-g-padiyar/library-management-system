const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    memberId: { type: String, unique: true }, // auto generated: LIB-0001
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['student', 'faculty', 'staff', 'public'], default: 'student' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    address: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Generate the next sequential member id (LIB-0001, LIB-0002, ...)
memberSchema.pre('validate', async function (next) {
  if (this.memberId) return next();
  const last = await this.constructor.findOne({}, { memberId: 1 }).sort({ memberId: -1 }).lean();
  const lastNum = last && last.memberId ? parseInt(last.memberId.split('-')[1], 10) : 0;
  this.memberId = `LIB-${String(lastNum + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Member', memberSchema);
