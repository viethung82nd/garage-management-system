import mongoose, { Schema } from "mongoose";

export const REPORT_PERIODS = ["daily", "weekly", "monthly", "quarterly", "yearly"];

const byServiceSchema = new Schema(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    serviceName: {
      type: String,
    },
    orderCount: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const byTechnicianSchema = new Schema(
  {
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    technicianName: {
      type: String,
    },
    orderCount: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    avgTime: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const byPaymentMethodSchema = new Schema(
  {
    method: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const revenueReportSchema = new Schema(
  {
    period: {
      type: String,
      enum: REPORT_PERIODS,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalInvoices: {
      type: Number,
      default: 0,
    },
    byService: {
      type: [byServiceSchema],
      default: [],
    },
    byTechnician: {
      type: [byTechnicianSchema],
      default: [],
    },
    byPaymentMethod: {
      type: [byPaymentMethodSchema],
      default: [],
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const RevenueReportModel = mongoose.model(
  "RevenueReport",
  revenueReportSchema
);
