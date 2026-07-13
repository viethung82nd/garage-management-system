/**
 * Seeds every collection with realistic English sample data so every screen
 * in the app has something to show for mockups/demos. Clears the collections
 * below first (NOT Otp/LookupSession — those are ephemeral security records,
 * left untouched) so re-running this always produces a clean, consistent
 * dataset instead of merging with unknown prior state.
 *
 * Usage: npm run seed   (from backend/)
 */
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { hashPassword } from "../src/utils/password.js";
import {
  UserModel,
  VehicleModel,
  ServiceModel,
  ServiceCategoryModel,
  BookingModel,
  BookingHistoryModel,
  InspectionReportModel,
  ServiceQuoteModel,
  RepairOrderModel,
  ServiceRequestModel,
  TransferRequestModel,
  ScheduleModel,
  InvoiceModel,
  PaymentModel,
  NotificationModel,
  ReviewModel,
} from "../src/models/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY_MS);
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);

// Real, freely-licensed (Unsplash License) photos — sourced and verified
// individually, not randomized placeholders.
const IMG = {
  engine: "https://images.unsplash.com/photo-1593142927747-8c1b758967a6?w=800&fm=jpg&q=60&auto=format&fit=crop",
  brake: "https://images.unsplash.com/photo-1635685789915-aa74fe48fd93?fm=jpg&q=60&w=800&auto=format&fit=crop",
  oil: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?fm=jpg&q=60&w=800&auto=format&fit=crop",
  tire: "https://images.unsplash.com/photo-1656232976683-7b688560e427?w=800&auto=format&fit=crop",
  battery: "https://images.unsplash.com/photo-1658152764378-a22d6676f938?w=800",
  ac: "https://images.unsplash.com/photo-1752552055661-fbb9ef5398fe?fm=jpg&q=60&w=800&auto=format&fit=crop",
  bodywork: "https://images.unsplash.com/photo-1530467216178-3bcd746fa511?w=800&auto=format&fit=crop",
  garage: "https://images.unsplash.com/photo-1643700973089-baa86a1ab9ee?w=800",
};

// Real accounts to preserve — confirmed with the user before this script was
// allowed to touch a database shared with the rest of the team.
const PRESERVED_EMAILS = ["huynhnmhe187232@fpt.edu.vn", "nguyenmanhhuynh15092004@gmail.com"];

async function clearCollections() {
  await Promise.all([
    UserModel.deleteMany({ email: { $nin: PRESERVED_EMAILS } }),
    VehicleModel.deleteMany({}),
    ServiceModel.deleteMany({}),
    ServiceCategoryModel.deleteMany({}),
    BookingModel.deleteMany({}),
    BookingHistoryModel.deleteMany({}),
    InspectionReportModel.deleteMany({}),
    ServiceQuoteModel.deleteMany({}),
    RepairOrderModel.deleteMany({}),
    ServiceRequestModel.deleteMany({}),
    TransferRequestModel.deleteMany({}),
    ScheduleModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    ReviewModel.deleteMany({}),
  ]);
  console.log("[seed] cleared existing collections");
}

async function seedUsers() {
  const passwordHash = await hashPassword("Password123!");

  const customers = await UserModel.insertMany([
    { fullName: "Emma Johnson", email: "emma.johnson@example.com", phone: "555-0101", passwordHash, role: "onlineCustomer", accountType: "registered", isEmailVerified: true },
    { fullName: "Liam Carter", email: "liam.carter@example.com", phone: "555-0102", passwordHash, role: "onlineCustomer", accountType: "registered", isEmailVerified: true },
    { fullName: "Olivia Brown", email: "olivia.brown@example.com", phone: "555-0103", passwordHash, role: "onlineCustomer", accountType: "registered", isEmailVerified: true },
    { fullName: "Noah Williams", email: "noah.williams@example.com", phone: "555-0104", passwordHash, role: "onlineCustomer", accountType: "registered", isEmailVerified: true },
    { fullName: "Ava Martinez", email: "ava.martinez@example.com", phone: "555-0105", passwordHash, role: "onlineCustomer", accountType: "registered", isEmailVerified: true },
    { fullName: "James Anderson", email: "james.anderson@example.com", phone: "555-0106", passwordHash, role: "onlineCustomer", accountType: "registered", isEmailVerified: true },
  ]);

  const walkIns = await UserModel.insertMany([
    { fullName: "Sophia Turner", phone: "555-0201", role: "walkInCustomer", accountType: "walkIn" },
    { fullName: "Ethan Walker", phone: "555-0202", role: "walkInCustomer", accountType: "walkIn" },
  ]);

  const advisors = await UserModel.insertMany([
    { fullName: "Daniel Foster", email: "daniel.foster@kapaservice.com", phone: "555-0301", passwordHash, role: "serviceAdvisor", accountType: "registered", isEmailVerified: true },
    { fullName: "Grace Mitchell", email: "grace.mitchell@kapaservice.com", phone: "555-0302", passwordHash, role: "serviceAdvisor", accountType: "registered", isEmailVerified: true },
    { fullName: "Ryan Cooper", email: "ryan.cooper@kapaservice.com", phone: "555-0303", passwordHash, role: "serviceAdvisor", accountType: "registered", isEmailVerified: true },
  ]);

  const technicians = await UserModel.insertMany([
    { fullName: "Marcus Reid", email: "marcus.reid@kapaservice.com", phone: "555-0401", passwordHash, role: "technician", accountType: "registered", isEmailVerified: true },
    { fullName: "Tyler Brooks", email: "tyler.brooks@kapaservice.com", phone: "555-0402", passwordHash, role: "technician", accountType: "registered", isEmailVerified: true },
    { fullName: "Chloe Bennett", email: "chloe.bennett@kapaservice.com", phone: "555-0403", passwordHash, role: "technician", accountType: "registered", isEmailVerified: true },
  ]);

  const accountants = await UserModel.insertMany([
    { fullName: "Hannah Price", email: "hannah.price@kapaservice.com", phone: "555-0501", passwordHash, role: "accountant", accountType: "registered", isEmailVerified: true },
    { fullName: "Nathan Ross", email: "nathan.ross@kapaservice.com", phone: "555-0502", passwordHash, role: "accountant", accountType: "registered", isEmailVerified: true },
  ]);

  const admin = await UserModel.create({
    fullName: "Victoria Adams",
    email: "admin@kapaservice.com",
    phone: "555-0001",
    passwordHash,
    role: "admin",
    accountType: "registered",
    isEmailVerified: true,
  });

  console.log(`[seed] users: ${customers.length + walkIns.length + advisors.length + technicians.length + accountants.length + 1}`);
  return { customers, walkIns, advisors, technicians, accountants, admin };
}

async function seedVehicles({ customers, walkIns }) {
  const vehicles = await VehicleModel.insertMany([
    { licensePlate: "7ABC123", brand: "Toyota", model: "Camry", year: 2021, color: "Silver", customerId: customers[0]._id, lastKnownMileage: 24500 },
    { licensePlate: "8XKL901", brand: "Honda", model: "CR-V", year: 2020, color: "Black", customerId: customers[0]._id, lastKnownMileage: 31200 },
    { licensePlate: "GRD4521", brand: "BMW", model: "3 Series", year: 2022, color: "White", customerId: customers[1]._id, lastKnownMileage: 15800 },
    { licensePlate: "9TRP330", brand: "Ford", model: "F-150", year: 2019, color: "Blue", customerId: customers[2]._id, lastKnownMileage: 48700 },
    { licensePlate: "LMN2287", brand: "Audi", model: "A4", year: 2023, color: "Gray", customerId: customers[3]._id, lastKnownMileage: 8200 },
    { licensePlate: "5QWE778", brand: "Chevrolet", model: "Malibu", year: 2018, color: "Red", customerId: customers[4]._id, lastKnownMileage: 62100 },
    { licensePlate: "ZXY6094", brand: "Volkswagen", model: "Jetta", year: 2021, color: "Dark Green", customerId: customers[5]._id, lastKnownMileage: 27600 },
    { licensePlate: "4HGT552", brand: "Mercedes-Benz", model: "C-Class", year: 2020, color: "Black", customerId: walkIns[0]._id, lastKnownMileage: 35300 },
    { licensePlate: "3KPL814", brand: "Nissan", model: "Altima", year: 2019, color: "Silver", customerId: walkIns[1]._id, lastKnownMileage: 41900 },
  ]);
  console.log(`[seed] vehicles: ${vehicles.length}`);
  return vehicles;
}

async function seedCatalog() {
  const categories = await ServiceCategoryModel.insertMany([
    { name: "Engine Diagnostics & Repair", description: "Computerized diagnostics and repair for engine performance issues.", isActive: true, imageUrl: IMG.engine },
    { name: "Brake Service", description: "Brake pad, rotor, and full brake system inspection and repair.", isActive: true, imageUrl: IMG.brake },
    { name: "Oil & Fluid Change", description: "Engine oil, coolant, transmission, and brake fluid service.", isActive: true, imageUrl: IMG.oil },
    { name: "Tire & Wheel Service", description: "Tire rotation, balancing, alignment, and replacement.", isActive: true, imageUrl: IMG.tire },
    { name: "Electrical System", description: "Battery, alternator, starter, and wiring diagnostics.", isActive: true, imageUrl: IMG.battery },
    { name: "AC & Climate Control", description: "Air conditioning recharge, repair, and cabin filter service.", isActive: true, imageUrl: IMG.ac },
    { name: "Bodywork & Paint", description: "Dent repair, panel refinishing, and paint touch-up.", isActive: true, imageUrl: IMG.bodywork },
    { name: "General Maintenance", description: "Scheduled maintenance packages and multi-point inspections.", isActive: true, imageUrl: IMG.garage },
  ]);

  const byName = Object.fromEntries(categories.map((c) => [c.name, c.name]));
  const services = await ServiceModel.insertMany([
    { name: "Full Engine Diagnostic Scan", category: byName["Engine Diagnostics & Repair"], basePrice: 89, estimatedDuration: 60, isActive: true },
    { name: "Check Engine Light Diagnosis", category: byName["Engine Diagnostics & Repair"], basePrice: 65, estimatedDuration: 45, isActive: true },
    { name: "Timing Belt Replacement", category: byName["Engine Diagnostics & Repair"], basePrice: 620, estimatedDuration: 240, isActive: true },
    { name: "Front Brake Pad Replacement", category: byName["Brake Service"], basePrice: 180, estimatedDuration: 75, isActive: true },
    { name: "Brake Rotor Resurfacing", category: byName["Brake Service"], basePrice: 140, estimatedDuration: 60, isActive: true },
    { name: "Full Brake System Inspection", category: byName["Brake Service"], basePrice: 45, estimatedDuration: 30, isActive: true },
    { name: "Synthetic Oil Change", category: byName["Oil & Fluid Change"], basePrice: 69, estimatedDuration: 30, isActive: true },
    { name: "Coolant Flush & Refill", category: byName["Oil & Fluid Change"], basePrice: 95, estimatedDuration: 45, isActive: true },
    { name: "Transmission Fluid Service", category: byName["Oil & Fluid Change"], basePrice: 150, estimatedDuration: 60, isActive: true },
    { name: "Tire Rotation & Balancing", category: byName["Tire & Wheel Service"], basePrice: 55, estimatedDuration: 40, isActive: true },
    { name: "Wheel Alignment", category: byName["Tire & Wheel Service"], basePrice: 99, estimatedDuration: 50, isActive: true },
    { name: "New Tire Set Installation", category: byName["Tire & Wheel Service"], basePrice: 480, estimatedDuration: 60, isActive: true },
    { name: "Car Battery Replacement", category: byName["Electrical System"], basePrice: 175, estimatedDuration: 30, isActive: true },
    { name: "Alternator Repair", category: byName["Electrical System"], basePrice: 320, estimatedDuration: 90, isActive: true },
    { name: "AC Recharge Service", category: byName["AC & Climate Control"], basePrice: 120, estimatedDuration: 45, isActive: true },
    { name: "Cabin Air Filter Replacement", category: byName["AC & Climate Control"], basePrice: 35, estimatedDuration: 20, isActive: true },
    { name: "Dent Removal & Panel Repair", category: byName["Bodywork & Paint"], basePrice: 250, estimatedDuration: 180, isActive: true },
    { name: "Full Multi-Point Inspection", category: byName["General Maintenance"], basePrice: 49, estimatedDuration: 40, isActive: true },
    { name: "Scheduled Maintenance Package", category: byName["General Maintenance"], basePrice: 210, estimatedDuration: 120, isActive: true },
  ]);

  console.log(`[seed] categories: ${categories.length}, services: ${services.length}`);
  return { categories, services };
}

async function seedBookings({ customers, walkIns, vehicles, services, advisors }) {
  const findService = (name) => services.find((s) => s.name === name);

  const specs = [
    { customer: customers[0], vehicle: vehicles[0], service: findService("Synthetic Oil Change"), day: 3, slot: "09:00", status: "pending", source: "online" },
    { customer: customers[1], vehicle: vehicles[2], service: findService("Full Brake System Inspection"), day: 1, slot: "10:00", status: "confirmed", source: "online", advisor: advisors[0] },
    { customer: customers[2], vehicle: vehicles[3], service: findService("Wheel Alignment"), day: 2, slot: "11:00", status: "confirmed", source: "online", advisor: advisors[1] },
    { customer: customers[3], vehicle: vehicles[4], service: findService("Full Engine Diagnostic Scan"), day: 5, slot: "13:00", status: "pending", source: "online" },
    { customer: customers[4], vehicle: vehicles[5], service: findService("Car Battery Replacement"), day: -1, slot: "14:00", status: "cancelled", source: "online" },
    { customer: customers[5], vehicle: vehicles[6], service: findService("AC Recharge Service"), day: 4, slot: "15:00", status: "rescheduled", source: "online", advisor: advisors[2] },
    { customer: walkIns[0], vehicle: vehicles[7], service: findService("Front Brake Pad Replacement"), day: -5, slot: "08:00", status: "completed", source: "walkIn", advisor: advisors[0] },
    { customer: walkIns[1], vehicle: vehicles[8], service: findService("Scheduled Maintenance Package"), day: -8, slot: "09:00", status: "completed", source: "walkIn", advisor: advisors[1] },
    { customer: customers[0], vehicle: vehicles[1], service: findService("Tire Rotation & Balancing"), day: -12, slot: "16:00", status: "completed", source: "online", advisor: advisors[2] },
    { customer: customers[1], vehicle: vehicles[2], service: findService("New Tire Set Installation"), day: 7, slot: "10:00", status: "pending", source: "online" },
  ];

  const bookings = [];
  for (const spec of specs) {
    const booking = new BookingModel({
      customerId: spec.customer._id,
      vehicleId: spec.vehicle._id,
      serviceId: spec.service._id,
      advisorId: spec.advisor?._id,
      bookingDate: spec.day >= 0 ? daysFromNow(spec.day) : daysAgo(-spec.day),
      timeSlot: spec.slot,
      source: spec.source,
      status: spec.status,
      seatNo: 1,
      note: "Booked via the online appointment form.",
    });
    await booking.save();
    bookings.push(booking);
  }

  const historyEntries = [
    { bookingId: bookings[1]._id, changedBy: advisors[0]._id, action: "confirmed", changedAt: daysAgo(1) },
    { bookingId: bookings[2]._id, changedBy: advisors[1]._id, action: "confirmed", changedAt: daysAgo(1) },
    { bookingId: bookings[4]._id, changedBy: customers[4]._id, action: "cancelled", reason: "Customer requested cancellation due to schedule conflict.", changedAt: daysAgo(1) },
    { bookingId: bookings[5]._id, changedBy: advisors[2]._id, action: "rescheduled", previousDate: daysFromNow(1), previousSlot: "09:00", reason: "Advisor requested a later slot to accommodate parts delivery.", changedAt: daysAgo(1) },
    { bookingId: bookings[6]._id, changedBy: advisors[0]._id, action: "completed", changedAt: daysAgo(5) },
    { bookingId: bookings[7]._id, changedBy: advisors[1]._id, action: "completed", changedAt: daysAgo(8) },
  ];
  await BookingHistoryModel.insertMany(historyEntries);

  console.log(`[seed] bookings: ${bookings.length}, booking history: ${historyEntries.length}`);
  return bookings;
}

async function seedRepairOrdersAndFollowOns({ vehicles, services, advisors, technicians, customers, walkIns, bookings }) {
  const findService = (name) => services.find((s) => s.name === name);
  const svcLine = (name, quantity = 1) => {
    const s = findService(name);
    return { serviceId: s._id, name: s.name, priceAtTime: s.basePrice, quantity };
  };

  // 1) Completed, invoiced repair order (walk-in brake job)
  const order1 = await RepairOrderModel.create({
    vehicleId: vehicles[7]._id,
    advisorId: advisors[0]._id,
    technicianId: technicians[0]._id,
    services: [svcLine("Front Brake Pad Replacement"), svcLine("Full Brake System Inspection")],
    status: "completed",
    totalCost: findService("Front Brake Pad Replacement").basePrice + findService("Full Brake System Inspection").basePrice,
    startedAt: daysAgo(5),
    completedAt: daysAgo(4),
    stepNotes: [
      { content: "Inspected front brake pads — 2mm remaining, replacement needed.", technicianId: technicians[0]._id, createdAt: daysAgo(5) },
      { content: "Installed new pads, resurfaced rotors, test-driven — no noise or vibration.", technicianId: technicians[0]._id, createdAt: daysAgo(4) },
      { content: "[QC pass] Brake pedal feel confirmed firm, no leaks found.", technicianId: advisors[0]._id, createdAt: daysAgo(4) },
    ],
  });

  // 2) Completed, invoiced repair order (walk-in maintenance package)
  const order2 = await RepairOrderModel.create({
    vehicleId: vehicles[8]._id,
    advisorId: advisors[1]._id,
    technicianId: technicians[1]._id,
    services: [svcLine("Scheduled Maintenance Package"), svcLine("Synthetic Oil Change")],
    status: "completed",
    totalCost: findService("Scheduled Maintenance Package").basePrice + findService("Synthetic Oil Change").basePrice,
    startedAt: daysAgo(8),
    completedAt: daysAgo(7),
    stepNotes: [
      { content: "Multi-point inspection complete — air filter due for replacement soon.", technicianId: technicians[1]._id, createdAt: daysAgo(8) },
      { content: "[QC pass] All fluids topped off, reset maintenance reminder.", technicianId: advisors[1]._id, createdAt: daysAgo(7) },
    ],
  });

  // 3) In progress
  const order3 = await RepairOrderModel.create({
    vehicleId: vehicles[0]._id,
    advisorId: advisors[0]._id,
    technicianId: technicians[0]._id,
    services: [svcLine("Full Engine Diagnostic Scan"), svcLine("Check Engine Light Diagnosis")],
    status: "inProgress",
    totalCost: findService("Full Engine Diagnostic Scan").basePrice + findService("Check Engine Light Diagnosis").basePrice,
    startedAt: daysAgo(1),
    stepNotes: [
      { content: "Scan shows a P0301 misfire code on cylinder 1 — inspecting ignition coil.", technicianId: technicians[0]._id, createdAt: daysAgo(1) },
    ],
  });

  // 4) Pending quality check (completed by technician, awaiting SA review)
  const order4 = await RepairOrderModel.create({
    vehicleId: vehicles[2]._id,
    advisorId: advisors[1]._id,
    technicianId: technicians[2]._id,
    services: [svcLine("Wheel Alignment"), svcLine("Tire Rotation & Balancing")],
    status: "completed",
    totalCost: findService("Wheel Alignment").basePrice + findService("Tire Rotation & Balancing").basePrice,
    startedAt: daysAgo(1),
    completedAt: new Date(),
    stepNotes: [
      { content: "Alignment adjusted to spec, all four tires rotated and balanced.", technicianId: technicians[2]._id, createdAt: new Date() },
    ],
  });

  // 5) Rework required (failed quality check)
  const order5 = await RepairOrderModel.create({
    vehicleId: vehicles[4]._id,
    advisorId: advisors[2]._id,
    technicianId: technicians[1]._id,
    services: [svcLine("Car Battery Replacement")],
    status: "reworkRequired",
    totalCost: findService("Car Battery Replacement").basePrice,
    startedAt: daysAgo(2),
    stepNotes: [
      { content: "Replaced battery and cleaned terminals.", technicianId: technicians[1]._id, createdAt: daysAgo(2) },
      { content: "[QC fail] Battery terminal connection still loose, dashboard warning light returned during test drive.", technicianId: advisors[2]._id, createdAt: daysAgo(1) },
    ],
  });

  // 6) Pending assignment
  const order6 = await RepairOrderModel.create({
    vehicleId: vehicles[5]._id,
    advisorId: advisors[0]._id,
    services: [svcLine("Dent Removal & Panel Repair")],
    status: "pending",
    totalCost: findService("Dent Removal & Panel Repair").basePrice,
  });

  const repairOrders = [order1, order2, order3, order4, order5, order6];
  console.log(`[seed] repair orders: ${repairOrders.length}`);

  // Inspection reports
  const inspections = await InspectionReportModel.insertMany([
    {
      repairOrderId: order3._id,
      vehicleId: vehicles[0]._id,
      advisorId: advisors[0]._id,
      findings: "Engine misfire detected on cylinder 1 during diagnostic scan. Ignition coil showing signs of wear.",
      estimatedCost: 240,
      odometer: 24680,
      fuelLevel: "3/4",
      items: [
        { category: "Engine", label: "Ignition coils", status: "repair", note: "Cylinder 1 coil arcing, replacement recommended.", laborCost: 60, partsCost: 85 },
        { category: "Engine", label: "Spark plugs", status: "monitor", note: "Slight wear, still within service life.", laborCost: 0, partsCost: 0 },
        { category: "Exterior", label: "Body panels", status: "ok", note: "No visible damage.", laborCost: 0, partsCost: 0 },
      ],
      photos: [IMG.engine],
      recommendedServices: [{ serviceId: findService("Full Engine Diagnostic Scan")._id, name: "Full Engine Diagnostic Scan", price: 89, isRequired: true }],
      status: "completed",
      inspectedAt: daysAgo(1),
    },
    {
      repairOrderId: order5._id,
      vehicleId: vehicles[4]._id,
      advisorId: advisors[2]._id,
      findings: "Battery replaced; terminal corrosion found on positive lead, requires cleaning and reseating.",
      estimatedCost: 40,
      odometer: 8250,
      fuelLevel: "1/2",
      items: [
        { category: "Electrical", label: "Battery terminals", status: "repair", note: "Corrosion on positive terminal causing intermittent connection.", laborCost: 25, partsCost: 15 },
      ],
      photos: [IMG.battery],
      recommendedServices: [],
      status: "completed",
      inspectedAt: daysAgo(1),
    },
    {
      bookingId: bookings[6]._id,
      vehicleId: vehicles[7]._id,
      advisorId: advisors[0]._id,
      findings: "Front brake pads worn to 2mm, rotors show light scoring. Rear brakes within spec.",
      estimatedCost: 220,
      odometer: 35100,
      fuelLevel: "Full",
      items: [
        { category: "Brakes", label: "Front pads", status: "repair", note: "2mm remaining, below safe threshold.", laborCost: 60, partsCost: 90 },
        { category: "Brakes", label: "Front rotors", status: "monitor", note: "Light scoring, resurfacing recommended.", laborCost: 40, partsCost: 30 },
      ],
      photos: [IMG.brake, IMG.garage],
      recommendedServices: [{ serviceId: findService("Brake Rotor Resurfacing")._id, name: "Brake Rotor Resurfacing", price: 140, isRequired: false }],
      status: "completed",
      inspectedAt: daysAgo(5),
    },
    {
      repairOrderId: order4._id,
      vehicleId: vehicles[2]._id,
      advisorId: advisors[1]._id,
      findings: "Front-end alignment out of spec, uneven tire wear on front-left.",
      estimatedCost: 154,
      odometer: 15900,
      fuelLevel: "1/2",
      items: [
        { category: "Suspension", label: "Front alignment", status: "repair", note: "Toe-in out of spec by 0.4 degrees.", laborCost: 99, partsCost: 0 },
        { category: "Tires", label: "Front-left tread", status: "monitor", note: "Slightly uneven wear pattern.", laborCost: 0, partsCost: 0 },
      ],
      photos: [IMG.tire],
      recommendedServices: [],
      status: "completed",
      inspectedAt: daysAgo(1),
    },
  ]);
  for (const report of inspections) {
    if (report.repairOrderId) {
      await RepairOrderModel.updateOne({ _id: report.repairOrderId, inspectionId: null }, { inspectionId: report._id });
    }
  }
  console.log(`[seed] inspection reports: ${inspections.length}`);

  // Service quotes
  const quotes = await ServiceQuoteModel.insertMany([
    {
      code: "QT-10231",
      repairOrderId: order3._id,
      customerId: customers[0]._id,
      advisorId: advisors[0]._id,
      customerName: customers[0].fullName,
      customerPhone: customers[0].phone,
      vehicleName: "Toyota Camry",
      vehiclePlate: vehicles[0].licensePlate,
      lines: [
        { description: "Ignition coil replacement (cylinder 1)", kind: "part", quantity: 1, unitPrice: 85 },
        { description: "Diagnostic labor", kind: "labor", quantity: 1, unitPrice: 60 },
      ],
      discountPercent: 0,
      taxPercent: 8,
      totalEstimate: Math.round((85 + 60) * 1.08),
      status: "sent",
      note: "Recommend replacing coil before it affects catalytic converter.",
      validUntil: daysFromNow(7),
    },
    {
      code: "QT-10245",
      repairOrderId: order5._id,
      customerId: customers[3]._id,
      advisorId: advisors[2]._id,
      customerName: customers[3].fullName,
      customerPhone: customers[3].phone,
      vehicleName: "Audi A4",
      vehiclePlate: vehicles[4].licensePlate,
      lines: [{ description: "Battery terminal cleaning and reseating", kind: "labor", quantity: 1, unitPrice: 25 }],
      discountPercent: 10,
      taxPercent: 8,
      totalEstimate: Math.round(25 * 0.9 * 1.08),
      status: "approved",
      note: "Included at no extra charge as part of the rework.",
      validUntil: daysFromNow(5),
    },
    {
      code: "QT-10198",
      customerId: customers[5]._id,
      advisorId: advisors[1]._id,
      customerName: customers[5].fullName,
      customerPhone: customers[5].phone,
      vehicleName: "Volkswagen Jetta",
      vehiclePlate: vehicles[6].licensePlate,
      lines: [{ description: "AC recharge service", kind: "service", quantity: 1, unitPrice: 120 }],
      discountPercent: 0,
      taxPercent: 8,
      totalEstimate: Math.round(120 * 1.08),
      status: "draft",
      note: "Waiting on customer confirmation for appointment slot.",
      validUntil: daysFromNow(10),
    },
  ]);
  console.log(`[seed] service quotes: ${quotes.length}`);

  // Additional service proposals
  const proposals = await ServiceRequestModel.insertMany([
    {
      repairOrderId: order1._id,
      technicianId: technicians[0]._id,
      serviceName: "Brake Rotor Resurfacing",
      affectedPart: "Front brake rotors",
      reason: "Light scoring found on both front rotors during pad replacement.",
      customerImpact: "May cause a faint vibration when braking if not addressed.",
      laborCost: 40,
      partsCost: 30,
      estimateMinutes: 45,
      evidenceCount: 2,
      priority: "medium",
      status: "sent",
    },
    {
      repairOrderId: order3._id,
      technicianId: technicians[0]._id,
      serviceName: "Spark Plug Replacement",
      affectedPart: "Cylinders 2-4 spark plugs",
      reason: "Plugs show early wear consistent with the misfire pattern.",
      customerImpact: "Reduced fuel efficiency if left unaddressed for another 5,000 miles.",
      laborCost: 45,
      partsCost: 40,
      estimateMinutes: 30,
      evidenceCount: 1,
      priority: "low",
      status: "pending",
    },
    {
      repairOrderId: order2._id,
      technicianId: technicians[1]._id,
      serviceName: "Cabin Air Filter Replacement",
      affectedPart: "Cabin air filter",
      reason: "Filter is visibly dirty and restricting airflow.",
      customerImpact: "Reduced AC/heater airflow and cabin air quality.",
      laborCost: 15,
      partsCost: 20,
      estimateMinutes: 15,
      evidenceCount: 1,
      priority: "low",
      status: "approved",
    },
  ]);
  console.log(`[seed] additional service proposals: ${proposals.length}`);

  // Transfer requests
  const transfers = await TransferRequestModel.insertMany([
    {
      repairOrderId: order3._id,
      fromTechnicianId: technicians[0]._id,
      toTechnicianId: technicians[2]._id,
      reason: "Shift ending, handing off engine diagnostic to closing technician.",
      status: "pending",
      requestedAt: new Date(),
    },
    {
      repairOrderId: order2._id,
      fromTechnicianId: technicians[1]._id,
      toTechnicianId: technicians[0]._id,
      reason: "Needed a second technician familiar with this transmission type.",
      status: "approved",
      resolvedBy: advisors[1]._id,
      resolveNote: "Approved — Marcus has more experience with this model.",
      requestedAt: daysAgo(8),
      resolvedAt: daysAgo(8),
    },
  ]);
  console.log(`[seed] transfer requests: ${transfers.length}`);

  return { repairOrders, order1, order2, order3, order4, order5, order6 };
}

async function seedSchedules({ technicians, repairOrders }) {
  const entries = [];
  for (let dayOffset = -2; dayOffset <= 4; dayOffset += 1) {
    for (const tech of technicians) {
      entries.push({
        technicianId: tech._id,
        date: daysFromNow(dayOffset),
        isAvailable: !(dayOffset === 2 && tech === technicians[1]),
        activeOrderIds: dayOffset === 0 ? repairOrders.slice(0, 2).map((o) => o._id) : [],
        activeOrderCount: dayOffset === 0 ? 2 : 0,
      });
    }
  }
  const schedules = await ScheduleModel.insertMany(entries);
  console.log(`[seed] technician schedule entries: ${schedules.length}`);
  return schedules;
}

async function seedInvoicesPayments({ order1, order2, accountants, customers, walkIns }) {
  const invoice1 = await InvoiceModel.create({
    repairOrderId: order1._id,
    accountantId: accountants[0]._id,
    lineItems: [
      { description: "Front Brake Pad Replacement", quantity: 1, unitPrice: 180 },
      { description: "Full Brake System Inspection", quantity: 1, unitPrice: 45 },
    ],
    subtotal: 225,
    discount: 0,
    total: 225,
    status: "paid",
    issuedAt: daysAgo(4),
  });

  const invoice2 = await InvoiceModel.create({
    repairOrderId: order2._id,
    accountantId: accountants[1]._id,
    lineItems: [
      { description: "Scheduled Maintenance Package", quantity: 1, unitPrice: 210 },
      { description: "Synthetic Oil Change", quantity: 1, unitPrice: 69 },
    ],
    subtotal: 279,
    discount: 20,
    total: 259,
    status: "unpaid",
    issuedAt: daysAgo(7),
  });

  const payments = await PaymentModel.insertMany([
    {
      invoiceId: invoice1._id,
      customerId: walkIns[0]._id,
      amount: 225,
      method: "card",
      gatewayRef: "MOCKPAY-88213",
      status: "succeeded",
      paidAt: daysAgo(4),
    },
    {
      invoiceId: invoice2._id,
      customerId: walkIns[1]._id,
      amount: 100,
      method: "cash",
      status: "pending",
    },
  ]);

  console.log(`[seed] invoices: 2, payments: ${payments.length}`);
  return { invoice1, invoice2 };
}

async function seedNotificationsReviews({ customers, advisors, technicians, order1, order2, bookings }) {
  const notifications = await NotificationModel.insertMany([
    { userId: customers[1]._id, type: "bookingConfirmed", title: "Appointment confirmed", message: "Your appointment for Full Brake System Inspection has been confirmed.", refId: bookings[1]._id, refModel: "Booking", isRead: false },
    { userId: customers[2]._id, type: "bookingConfirmed", title: "Appointment confirmed", message: "Your appointment for Wheel Alignment has been confirmed.", refId: bookings[2]._id, refModel: "Booking", isRead: true },
    { userId: customers[4]._id, type: "bookingCancelled", title: "Appointment cancelled", message: "Your appointment has been cancelled as requested.", refId: bookings[4]._id, refModel: "Booking", isRead: true },
    { userId: customers[0]._id, type: "quotationSent", title: "New repair quote", message: "A new quote is ready for your review.", refId: order1._id, refModel: "RepairOrder", isRead: false },
    { userId: advisors[0]._id, type: "workOrderAssigned", title: "New repair order", message: "You have a new repair order awaiting technician assignment.", refId: order1._id, refModel: "RepairOrder", isRead: true },
    { userId: technicians[0]._id, type: "workOrderAssigned", title: "New task assigned", message: "You've been assigned to a new repair order.", refId: order1._id, refModel: "RepairOrder", isRead: true },
    { userId: technicians[1]._id, type: "reworkRequired", title: "Rework requested", message: "A repair order was sent back for rework — please review the QC notes.", refId: order2._id, refModel: "RepairOrder", isRead: false },
    { userId: customers[0]._id, type: "bookingReminder", title: "Upcoming appointment", message: "Reminder: your oil change appointment is coming up soon.", isRead: false },
  ]);

  const reviews = await ReviewModel.insertMany([
    { customerId: customers[0]._id, repairOrderId: order1._id, technicianId: technicians[0]._id, rating: 5, comment: "Fast, friendly service — my brakes feel brand new. Highly recommend!" },
    { customerId: customers[1]._id, repairOrderId: order2._id, technicianId: technicians[1]._id, rating: 4, comment: "Good work overall, though it took a bit longer than the estimate." },
  ]);

  console.log(`[seed] notifications: ${notifications.length}, reviews: ${reviews.length}`);
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log("[seed] connected to MongoDB");

  await clearCollections();

  const { customers, walkIns, advisors, technicians, accountants, admin } = await seedUsers();
  const vehicles = await seedVehicles({ customers, walkIns });
  const { services } = await seedCatalog();
  const bookings = await seedBookings({ customers, walkIns, vehicles, services, advisors });
  const { repairOrders, order1, order2, order3, order4, order5, order6 } = await seedRepairOrdersAndFollowOns({
    vehicles,
    services,
    advisors,
    technicians,
    customers,
    walkIns,
    bookings,
  });
  await seedSchedules({ technicians, repairOrders });
  await seedInvoicesPayments({ order1, order2, accountants, customers, walkIns });
  await seedNotificationsReviews({ customers, advisors, technicians, order1, order2, bookings });

  console.log("\n[seed] done. Login with any seeded account, password: Password123!");
  console.log(`  admin:           ${admin.email}`);
  console.log(`  service advisor: ${advisors[0].email}`);
  console.log(`  technician:      ${technicians[0].email}`);
  console.log(`  accountant:      ${accountants[0].email}`);
  console.log(`  customer:        ${customers[0].email}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
