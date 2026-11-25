import mongoose from 'mongoose';
import { REPORT_TYPES, REPORT_STATUSES } from '../../shared/report.js';

const reportSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'itemName is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      trim: true,
      maxlength: 60,
    },
    color: {
      type: String,
      required: [true, 'color is required'],
      trim: true,
      maxlength: 50,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
      maxlength: 60,
    },
    location: {
      type: String,
      required: [true, 'location is required'],
      trim: true,
      maxlength: 120,
    },
    date: {
      type: String,
      required: [true, 'date (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    time: {
      type: String,
      required: [true, 'time (HH:mm) is required'],
      match: [/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Time must be in 24-hour format HH:mm'],
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
      maxlength: 1000,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: [REPORT_TYPES.LOST, REPORT_TYPES.FOUND],
        message: 'type must be either LOST or FOUND',
      },
      required: [true, 'type is required'],
    },
    status: {
      type: String,
      enum: {
        values: [REPORT_STATUSES.ACTIVE, REPORT_STATUSES.REUNITED],
        message: 'status must be either ACTIVE or REUNITED',
      },
      default: REPORT_STATUSES.ACTIVE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes to optimize match queries and listing
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ location: 1 });
reportSchema.index({ createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;
