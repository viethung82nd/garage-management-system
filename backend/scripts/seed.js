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
import { logAudit } from "../src/utils/audit.js";
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
  AuditLogModel,
  PartModel,
  // Collections added across the transformation phases — cleared on re-seed so
  // stale documents from a prior schema don't linger.
  CounterModel,
  RepairOrderStatusHistoryModel,
  QuoteVersionModel,
  DeferredWorkModel,
  InventoryTransactionModel,
  StockReservationModel,
  SupplierModel,
  PurchaseOrderModel,
  TimeLogModel,
  OdometerLogModel,
  ReminderModel,
  FollowUpModel,
} from "../src/models/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY_MS);
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);

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
    // ServiceCategoryModel AND ServiceModel are deliberately NOT cleared — the
    // categories and the service catalog under them were curated by hand and
    // must survive a re-seed (per the team's request). seedCatalog reuses
    // whatever is already there and only inserts defaults on an empty DB.
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
    AuditLogModel.deleteMany({}),
    PartModel.deleteMany({}),
    // Transformation-era collections.
    CounterModel.deleteMany({}),
    RepairOrderStatusHistoryModel.deleteMany({}),
    QuoteVersionModel.deleteMany({}),
    DeferredWorkModel.deleteMany({}),
    InventoryTransactionModel.deleteMany({}),
    StockReservationModel.deleteMany({}),
    SupplierModel.deleteMany({}),
    PurchaseOrderModel.deleteMany({}),
    TimeLogModel.deleteMany({}),
    OdometerLogModel.deleteMany({}),
    ReminderModel.deleteMany({}),
    FollowUpModel.deleteMany({}),
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
  // The 8 categories below are real — created earlier and renamed through
  // the admin UI to their bilingual VN/EN names. They are NOT recreated
  // here (clearCollections leaves ServiceCategoryModel untouched); every
  // service below is linked to one of these exact, already-live names.
  //
  // The service catalog that used to sit under them was orphaned: every
  // existing Service.category value was either a stale English category
  // name from an earlier seed (e.g. "Electrical System", which matches no
  // real category anymore) or, for several entries, literally a category
  // ObjectId string instead of its name. None of them resolved against a
  // real ServiceCategory, so the SA's per-category inspection checklist
  // could never find real services for any category and always fell back
  // to the generic seed. This rebuild fixes the linkage and fills out a
  // real, market-researched menu per category — matched to a dealer/
  // authorized-service-center structure (Express/Maintenance/General
  // repair/Bodywork/Warranty/Recall/Mobile/Other), not a generic
  // independent-garage one, since that's what these 8 categories actually
  // describe. Priced on the same VND scale the rest of the demo data uses.
  const categories = await ServiceCategoryModel.find({}).sort({ createdAt: 1 });
  if (categories.length === 0) {
    throw new Error(
      "[seed] No ServiceCategory documents found — this script expects the 8 real categories to already exist (it does not create them). Create them first via the admin UI, or restore clearing ServiceCategoryModel in clearCollections() if you actually want fresh demo categories."
    );
  }
  // Services are preserved across re-seeds (see clearCollections). If any
  // already exist, reuse them as-is — the downstream lookups are by name, and
  // these are the same names this catalog originally created. Only a truly
  // empty catalog gets the default menu inserted.
  const existingServices = await ServiceModel.find({});
  if (existingServices.length > 0) {
    console.log(
      `[seed] categories: ${categories.length} (preserved), services: ${existingServices.length} (preserved, not reseeded)`
    );
    return { categories, services: existingServices };
  }

  const byName = Object.fromEntries(categories.map((c) => [c.name, c.name]));

  const EXPRESS = "Bảo Dưỡng Nhanh/Express Service";
  const MAINTENANCE = "Bảo dưỡng/Maintenance";
  const GENERAL_REPAIR = "Sửa chữa chung/General repair";
  const BODYWORK = "Đồng sơn/B-P repair";
  const WARRANTY = "Bảo hành/Warranty repair";
  const RECALL = "Chương trình triệu hồi/Re-call";
  const MOBILE = "Bảo dưỡng lưu động/ Mobile Service";
  const OTHER = "Dịch vụ khác/Other Services";

  // seedBookings/seedRepairOrdersAndFollowOns/seedInvoicesPayments below all
  // look services up by exact name via findService() — every name kept from
  // the previous catalog revision (Full Engine Diagnostic Scan, Front Brake
  // Pad Replacement, Synthetic Oil Change, etc.) is unchanged here, only
  // its category re-pointed at a real one, so none of those lookups break.
  const services = await ServiceModel.insertMany([
    // --- Express Service — quick, no-appointment jobs ---
    { name: "Express Oil Change", category: byName[EXPRESS], basePrice: 45000, estimatedDuration: 20, isActive: true },
    { name: "Tire Pressure Check & Top-Up", category: byName[EXPRESS], basePrice: 15000, estimatedDuration: 10, isActive: true },
    { name: "Wiper Blade Replacement", category: byName[EXPRESS], basePrice: 20000, estimatedDuration: 10, isActive: true },
    { name: "Battery Quick Test", category: byName[EXPRESS], basePrice: 15000, estimatedDuration: 10, isActive: true },
    { name: "Headlight & Taillight Bulb Replacement", category: byName[EXPRESS], basePrice: 30000, estimatedDuration: 15, isActive: true },
    { name: "Cabin Air Filter Replacement", category: byName[EXPRESS], basePrice: 35000, estimatedDuration: 20, isActive: true },

    // --- Maintenance — scheduled maintenance ---
    { name: "Synthetic Oil Change", category: byName[MAINTENANCE], basePrice: 69000, estimatedDuration: 30, isActive: true },
    { name: "Scheduled Maintenance Package", category: byName[MAINTENANCE], basePrice: 210000, estimatedDuration: 120, isActive: true },
    { name: "Full Multi-Point Inspection", category: byName[MAINTENANCE], basePrice: 49000, estimatedDuration: 40, isActive: true },
    { name: "Coolant Flush & Refill", category: byName[MAINTENANCE], basePrice: 95000, estimatedDuration: 45, isActive: true },
    { name: "Transmission Fluid Service", category: byName[MAINTENANCE], basePrice: 150000, estimatedDuration: 60, isActive: true },
    { name: "Engine Air Filter Replacement", category: byName[MAINTENANCE], basePrice: 40000, estimatedDuration: 20, isActive: true },
    { name: "Spark Plug Replacement", category: byName[MAINTENANCE], basePrice: 85000, estimatedDuration: 40, isActive: true },

    // --- General repair — the broad component-repair bucket ---
    { name: "Full Engine Diagnostic Scan", category: byName[GENERAL_REPAIR], basePrice: 89000, estimatedDuration: 60, isActive: true },
    { name: "Check Engine Light Diagnosis", category: byName[GENERAL_REPAIR], basePrice: 65000, estimatedDuration: 45, isActive: true },
    { name: "Front Brake Pad Replacement", category: byName[GENERAL_REPAIR], basePrice: 180000, estimatedDuration: 75, isActive: true },
    { name: "Rear Brake Pad Replacement", category: byName[GENERAL_REPAIR], basePrice: 165000, estimatedDuration: 70, isActive: true },
    { name: "Brake Rotor Resurfacing", category: byName[GENERAL_REPAIR], basePrice: 140000, estimatedDuration: 60, isActive: true },
    { name: "Full Brake System Inspection", category: byName[GENERAL_REPAIR], basePrice: 45000, estimatedDuration: 30, isActive: true },
    { name: "Brake Fluid Flush", category: byName[GENERAL_REPAIR], basePrice: 75000, estimatedDuration: 30, isActive: true },
    { name: "Wheel Alignment", category: byName[GENERAL_REPAIR], basePrice: 99000, estimatedDuration: 50, isActive: true },
    { name: "Tire Rotation & Balancing", category: byName[GENERAL_REPAIR], basePrice: 55000, estimatedDuration: 40, isActive: true },
    { name: "New Tire Set Installation", category: byName[GENERAL_REPAIR], basePrice: 480000, estimatedDuration: 60, isActive: true },
    { name: "Car Battery Replacement", category: byName[GENERAL_REPAIR], basePrice: 175000, estimatedDuration: 30, isActive: true },
    { name: "Alternator Repair", category: byName[GENERAL_REPAIR], basePrice: 320000, estimatedDuration: 90, isActive: true },
    { name: "Starter Motor Replacement", category: byName[GENERAL_REPAIR], basePrice: 380000, estimatedDuration: 100, isActive: true },
    { name: "Shock Absorber Replacement", category: byName[GENERAL_REPAIR], basePrice: 350000, estimatedDuration: 150, isActive: true },
    { name: "Power Steering Fluid Flush", category: byName[GENERAL_REPAIR], basePrice: 65000, estimatedDuration: 30, isActive: true },
    { name: "Timing Belt Replacement", category: byName[GENERAL_REPAIR], basePrice: 620000, estimatedDuration: 240, isActive: true },
    { name: "AC Recharge Service", category: byName[GENERAL_REPAIR], basePrice: 120000, estimatedDuration: 45, isActive: true },
    { name: "AC Compressor Repair", category: byName[GENERAL_REPAIR], basePrice: 450000, estimatedDuration: 120, isActive: true },

    // --- Bodywork & paint — B-P repair ---
    { name: "Dent Removal & Panel Repair", category: byName[BODYWORK], basePrice: 250000, estimatedDuration: 180, isActive: true },
    { name: "Paint Touch-Up (Small Area)", category: byName[BODYWORK], basePrice: 150000, estimatedDuration: 90, isActive: true },
    { name: "Bumper Repair", category: byName[BODYWORK], basePrice: 300000, estimatedDuration: 150, isActive: true },
    { name: "Scratch & Scuff Removal", category: byName[BODYWORK], basePrice: 80000, estimatedDuration: 45, isActive: true },
    { name: "Headlight Lens Restoration", category: byName[BODYWORK], basePrice: 60000, estimatedDuration: 40, isActive: true },

    // --- Warranty repair — labor charge only, parts covered by manufacturer ---
    { name: "Warranty Diagnostic Review", category: byName[WARRANTY], basePrice: 30000, estimatedDuration: 45, isActive: true },
    { name: "Warranty Parts Replacement (Labor)", category: byName[WARRANTY], basePrice: 50000, estimatedDuration: 90, isActive: true },
    { name: "Powertrain Warranty Repair (Labor)", category: byName[WARRANTY], basePrice: 80000, estimatedDuration: 150, isActive: true },
    { name: "Electrical System Warranty Repair (Labor)", category: byName[WARRANTY], basePrice: 45000, estimatedDuration: 60, isActive: true },

    // --- Recall program — always free of charge, safety-mandated ---
    { name: "Manufacturer Recall Inspection", category: byName[RECALL], basePrice: 0, estimatedDuration: 30, isActive: true },
    { name: "Recall Software / ECU Update", category: byName[RECALL], basePrice: 0, estimatedDuration: 45, isActive: true },
    { name: "Recall Airbag Component Replacement", category: byName[RECALL], basePrice: 0, estimatedDuration: 90, isActive: true },
    { name: "Recall Fuel System Component Replacement", category: byName[RECALL], basePrice: 0, estimatedDuration: 90, isActive: true },

    // --- Mobile Service — technician dispatched to the customer ---
    { name: "Mobile Battery Replacement", category: byName[MOBILE], basePrice: 200000, estimatedDuration: 40, isActive: true },
    { name: "Mobile Oil Change", category: byName[MOBILE], basePrice: 90000, estimatedDuration: 30, isActive: true },
    { name: "Mobile Flat Tire Change", category: byName[MOBILE], basePrice: 60000, estimatedDuration: 30, isActive: true },
    { name: "Mobile Jump-Start Service", category: byName[MOBILE], basePrice: 80000, estimatedDuration: 20, isActive: true },
    { name: "Mobile Pre-Trip Inspection", category: byName[MOBILE], basePrice: 100000, estimatedDuration: 40, isActive: true },

    // --- Other Services ---
    { name: "Vehicle Detailing", category: byName[OTHER], basePrice: 250000, estimatedDuration: 120, isActive: true },
    { name: "Pre-Purchase Inspection", category: byName[OTHER], basePrice: 150000, estimatedDuration: 90, isActive: true },
    { name: "Car Wash & Interior Cleaning", category: byName[OTHER], basePrice: 60000, estimatedDuration: 45, isActive: true },
    { name: "Roadside Assistance Callout", category: byName[OTHER], basePrice: 150000, estimatedDuration: 30, isActive: true },
    { name: "Custom Accessory Installation", category: byName[OTHER], basePrice: 120000, estimatedDuration: 60, isActive: true },
  ]);

  console.log(`[seed] categories: ${categories.length} (preserved), services: ${services.length}`);
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
      serviceCategory: spec.service.category,
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

  // 1) Completed, invoiced repair order (walk-in brake job). qcPassedAt /
  // invoicedAt / forwardedToAccountantAt are stamped so it reflects the real
  // post-Phase-2 flow (QC gate → forward → invoice) rather than a bare
  // "completed" status the accountant's billing queue would misread.
  const order1 = await RepairOrderModel.create({
    vehicleId: vehicles[7]._id,
    advisorId: advisors[0]._id,
    technicianId: technicians[0]._id,
    services: [svcLine("Front Brake Pad Replacement"), svcLine("Full Brake System Inspection")],
    status: "completed",
    totalCost: findService("Front Brake Pad Replacement").basePrice + findService("Full Brake System Inspection").basePrice,
    startedAt: daysAgo(5),
    completedAt: daysAgo(4),
    qcPassedAt: daysAgo(4),
    qcBy: advisors[0]._id,
    forwardedToAccountantAt: daysAgo(4),
    invoicedAt: daysAgo(4),
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
    qcPassedAt: daysAgo(7),
    qcBy: advisors[1]._id,
    forwardedToAccountantAt: daysAgo(7),
    invoicedAt: daysAgo(7),
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

  // 4) Completed, quality-checked, invoiced weeks ago — invoice now overdue
  // (demo case for accountant overdue tracking).
  const order4 = await RepairOrderModel.create({
    vehicleId: vehicles[2]._id,
    advisorId: advisors[1]._id,
    technicianId: technicians[2]._id,
    services: [svcLine("Wheel Alignment"), svcLine("Tire Rotation & Balancing")],
    status: "completed",
    totalCost: findService("Wheel Alignment").basePrice + findService("Tire Rotation & Balancing").basePrice,
    startedAt: daysAgo(21),
    completedAt: daysAgo(20),
    qcPassedAt: daysAgo(20),
    qcBy: advisors[1]._id,
    forwardedToAccountantAt: daysAgo(20),
    invoicedAt: daysAgo(20),
    stepNotes: [
      { content: "Alignment adjusted to spec, all four tires rotated and balanced.", technicianId: technicians[2]._id, createdAt: daysAgo(20) },
      { content: "[QC pass] Test drive confirms straight tracking, no pull.", technicianId: advisors[1]._id, createdAt: daysAgo(20) },
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
    serviceCategory: findService("Dent Removal & Panel Repair").category,
    status: "pending",
    totalCost: findService("Dent Removal & Panel Repair").basePrice,
  });

  // 7) Just opened at reception, not yet quoted — backs the draft quote below
  // (ServiceQuote.repairOrderId/vehicleId are both required, so a draft quote
  // needs a real order to attach to, same as the real reception flow).
  const order7 = await RepairOrderModel.create({
    vehicleId: vehicles[6]._id,
    advisorId: advisors[1]._id,
    services: [svcLine("AC Recharge Service")],
    serviceCategory: findService("AC Recharge Service").category,
    status: "pending",
    totalCost: findService("AC Recharge Service").basePrice,
  });

  // 8) Completed, QC-passed and forwarded to accounting but NOT yet invoiced —
  // this is what the accountant actually bills. Without one, the "ready to
  // invoice" queue is empty on a fresh demo DB and the accountant screen looks
  // broken even though it isn't.
  const order8 = await RepairOrderModel.create({
    vehicleId: vehicles[3]._id,
    advisorId: advisors[2]._id,
    technicianId: technicians[0]._id,
    services: [svcLine("Synthetic Oil Change"), svcLine("Full Multi-Point Inspection")],
    status: "readyForDelivery",
    totalCost: findService("Synthetic Oil Change").basePrice + findService("Full Multi-Point Inspection").basePrice,
    startedAt: daysAgo(1),
    completedAt: hoursAgo(3),
    qcPassedAt: hoursAgo(2),
    qcBy: advisors[2]._id,
    forwardedToAccountantAt: hoursAgo(1),
    stepNotes: [
      { content: "Oil and filter changed, multi-point inspection completed.", technicianId: technicians[0]._id, createdAt: hoursAgo(3) },
      { content: "[QC pass] All checks green, ready to invoice.", technicianId: advisors[2]._id, createdAt: hoursAgo(2) },
    ],
  });

  const repairOrders = [order1, order2, order3, order4, order5, order6, order7, order8];
  console.log(`[seed] repair orders: ${repairOrders.length}`);

  // Inspection reports
  const inspections = await InspectionReportModel.insertMany([
    {
      repairOrderId: order3._id,
      vehicleId: vehicles[0]._id,
      advisorId: advisors[0]._id,
      findings: "Engine misfire detected on cylinder 1 during diagnostic scan. Ignition coil showing signs of wear.",
      estimatedCost: 240000,
      odometer: 24680,
      fuelLevel: "3/4",
      items: [
        { category: "Engine", label: "Ignition coils", status: "repair", note: "Cylinder 1 coil arcing, replacement recommended.", laborCost: 60000, partsCost: 85000 },
        { category: "Engine", label: "Spark plugs", status: "monitor", note: "Slight wear, still within service life.", laborCost: 0, partsCost: 0 },
        { category: "Exterior", label: "Body panels", status: "ok", note: "No visible damage.", laborCost: 0, partsCost: 0 },
      ],
      photos: [IMG.engine],
      recommendedServices: [{ serviceId: findService("Full Engine Diagnostic Scan")._id, name: "Full Engine Diagnostic Scan", price: 89000, isRequired: true }],
      status: "completed",
      inspectedAt: daysAgo(1),
    },
    {
      repairOrderId: order5._id,
      vehicleId: vehicles[4]._id,
      advisorId: advisors[2]._id,
      findings: "Battery replaced; terminal corrosion found on positive lead, requires cleaning and reseating.",
      estimatedCost: 40000,
      odometer: 8250,
      fuelLevel: "1/2",
      items: [
        { category: "Electrical", label: "Battery terminals", status: "repair", note: "Corrosion on positive terminal causing intermittent connection.", laborCost: 25000, partsCost: 15000 },
      ],
      photos: [IMG.battery],
      recommendedServices: [],
      status: "completed",
      inspectedAt: daysAgo(1),
    },
    {
      bookingId: bookings[6]._id,
      repairOrderId: order1._id,
      vehicleId: vehicles[7]._id,
      advisorId: advisors[0]._id,
      findings: "Front brake pads worn to 2mm, rotors show light scoring. Rear brakes within spec.",
      estimatedCost: 220000,
      odometer: 35100,
      fuelLevel: "Full",
      items: [
        { category: "Brakes", label: "Front pads", status: "repair", note: "2mm remaining, below safe threshold.", laborCost: 60000, partsCost: 90000 },
        { category: "Brakes", label: "Front rotors", status: "monitor", note: "Light scoring, resurfacing recommended.", laborCost: 40000, partsCost: 30000 },
      ],
      photos: [IMG.brake, IMG.garage],
      recommendedServices: [{ serviceId: findService("Brake Rotor Resurfacing")._id, name: "Brake Rotor Resurfacing", price: 140000, isRequired: false }],
      status: "completed",
      inspectedAt: daysAgo(5),
    },
    {
      repairOrderId: order2._id,
      vehicleId: vehicles[8]._id,
      advisorId: advisors[1]._id,
      findings: "Multi-point inspection ahead of scheduled maintenance — fluids low, air filter due soon.",
      estimatedCost: 279000,
      odometer: 41900,
      fuelLevel: "1/2",
      items: [
        { category: "Fluids", label: "Engine oil", status: "repair", note: "Due for a full synthetic oil change.", laborCost: 20000, partsCost: 49000 },
        { category: "Filters", label: "Air filter", status: "monitor", note: "Visibly dirty, replace within 5,000 miles.", laborCost: 0, partsCost: 0 },
      ],
      photos: [IMG.oil, IMG.garage],
      recommendedServices: [],
      status: "completed",
      inspectedAt: daysAgo(8),
    },
    {
      repairOrderId: order4._id,
      vehicleId: vehicles[2]._id,
      advisorId: advisors[1]._id,
      findings: "Front-end alignment out of spec, uneven tire wear on front-left.",
      estimatedCost: 154000,
      odometer: 15900,
      fuelLevel: "1/2",
      items: [
        { category: "Suspension", label: "Front alignment", status: "repair", note: "Toe-in out of spec by 0.4 degrees.", laborCost: 99000, partsCost: 0 },
        { category: "Tires", label: "Front-left tread", status: "monitor", note: "Slightly uneven wear pattern.", laborCost: 0, partsCost: 0 },
      ],
      photos: [IMG.tire],
      recommendedServices: [],
      status: "completed",
      inspectedAt: daysAgo(21),
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
      vehicleId: vehicles[0]._id,
      customerId: customers[0]._id,
      advisorId: advisors[0]._id,
      customerName: customers[0].fullName,
      customerPhone: customers[0].phone,
      vehicleName: "Toyota Camry",
      vehiclePlate: vehicles[0].licensePlate,
      lines: [
        { description: "Ignition coil replacement (cylinder 1)", kind: "part", quantity: 1, unitPrice: 85000 },
        { description: "Diagnostic labor", kind: "labor", quantity: 1, unitPrice: 60000 },
      ],
      discountPercent: 0,
      taxPercent: 8,
      totalEstimate: Math.round((85000 + 60000) * 1.08),
      status: "sent",
      note: "Recommend replacing coil before it affects catalytic converter.",
      validUntil: daysFromNow(7),
    },
    {
      code: "QT-10245",
      repairOrderId: order5._id,
      vehicleId: vehicles[4]._id,
      customerId: customers[3]._id,
      advisorId: advisors[2]._id,
      customerName: customers[3].fullName,
      customerPhone: customers[3].phone,
      vehicleName: "Audi A4",
      vehiclePlate: vehicles[4].licensePlate,
      lines: [{ description: "Battery terminal cleaning and reseating", kind: "labor", quantity: 1, unitPrice: 25000 }],
      discountPercent: 10,
      taxPercent: 8,
      totalEstimate: Math.round(25000 * 0.9 * 1.08),
      status: "approved",
      note: "Included at no extra charge as part of the rework.",
      validUntil: daysFromNow(5),
    },
    {
      code: "QT-10198",
      repairOrderId: order7._id,
      vehicleId: vehicles[6]._id,
      customerId: customers[5]._id,
      advisorId: advisors[1]._id,
      customerName: customers[5].fullName,
      customerPhone: customers[5].phone,
      vehicleName: "Volkswagen Jetta",
      vehiclePlate: vehicles[6].licensePlate,
      lines: [{ description: "AC recharge service", kind: "service", quantity: 1, unitPrice: 120000 }],
      discountPercent: 0,
      taxPercent: 8,
      totalEstimate: Math.round(120000 * 1.08),
      status: "draft",
      note: "Waiting on customer confirmation for appointment slot.",
      validUntil: daysFromNow(10),
    },
    // Confirmed quotes behind order2's and order4's invoices — lets the
    // accountant's "View original quote" cross-check show real matching data.
    {
      code: "QT-10267",
      repairOrderId: order2._id,
      vehicleId: vehicles[8]._id,
      customerId: walkIns[1]._id,
      advisorId: advisors[1]._id,
      customerName: walkIns[1].fullName,
      customerPhone: walkIns[1].phone,
      vehicleName: "Nissan Altima",
      vehiclePlate: vehicles[8].licensePlate,
      lines: [
        { description: "Scheduled Maintenance Package", kind: "service", quantity: 1, unitPrice: 210000 },
        { description: "Synthetic Oil Change", kind: "service", quantity: 1, unitPrice: 69000 },
      ],
      discountPercent: 5,
      taxPercent: 8,
      totalEstimate: 286000,
      status: "approved",
      note: "Loyalty discount applied — repeat walk-in customer.",
      validUntil: daysAgo(1),
    },
    {
      code: "QT-10276",
      repairOrderId: order4._id,
      vehicleId: vehicles[2]._id,
      customerId: customers[1]._id,
      advisorId: advisors[1]._id,
      customerName: customers[1].fullName,
      customerPhone: customers[1].phone,
      vehicleName: "BMW 3 Series",
      vehiclePlate: vehicles[2].licensePlate,
      lines: [
        { description: "Wheel Alignment", kind: "service", quantity: 1, unitPrice: 99000 },
        { description: "Tire Rotation & Balancing", kind: "service", quantity: 1, unitPrice: 55000 },
      ],
      discountPercent: 0,
      taxPercent: 8,
      totalEstimate: 166000,
      status: "approved",
      note: "Standard alignment package.",
      validUntil: daysAgo(19),
    },
  ]);
  console.log(`[seed] service quotes: ${quotes.length}`);

  // Sync order2 and order4 with their confirmed quotes, same as
  // quotation.service.js's confirmQuotation would — so their invoices can
  // demonstrate the quote↔invoice sync (order2) and a post-quote addition
  // that legitimately diverges from the quote (order4, below).
  const quote2 = quotes[3];
  const quote4 = quotes[4];

  order2.quoteId = quote2._id;
  order2.quotedDiscountPercent = quote2.discountPercent;
  order2.quotedTaxPercent = quote2.taxPercent;
  order2.quotedTotal = quote2.totalEstimate;
  await order2.save();

  order4.quoteId = quote4._id;
  order4.quotedDiscountPercent = quote4.discountPercent;
  order4.quotedTaxPercent = quote4.taxPercent;
  order4.quotedTotal = quote4.totalEstimate;
  // A wheel-bearing noise the technician found while under the car — approved
  // and added after the quote was confirmed, so the invoice total legitimately
  // exceeds what was quoted.
  order4.services.push({
    name: "Wheel Bearing Inspection & Repack",
    priceAtTime: 35000,
    quantity: 1,
    kind: "labor",
    source: "additionalService",
  });
  order4.totalCost = 189000;
  await order4.save();

  // Additional service proposals
  const proposals = await ServiceRequestModel.insertMany([
    {
      repairOrderId: order1._id,
      technicianId: technicians[0]._id,
      serviceName: "Brake Rotor Resurfacing",
      affectedPart: "Front brake rotors",
      reason: "Light scoring found on both front rotors during pad replacement.",
      customerImpact: "May cause a faint vibration when braking if not addressed.",
      laborCost: 40000,
      partsCost: 30000,
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
      laborCost: 45000,
      partsCost: 40000,
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
      laborCost: 15000,
      partsCost: 20000,
      estimateMinutes: 15,
      evidenceCount: 1,
      priority: "low",
      status: "approved",
    },
    {
      repairOrderId: order4._id,
      technicianId: technicians[2]._id,
      serviceName: "Wheel Bearing Inspection & Repack",
      affectedPart: "Front-left wheel bearing",
      reason: "Slight roughness felt while spinning the wheel during alignment work.",
      customerImpact: "Left unaddressed, bearing wear can progress to noise and eventual failure.",
      laborCost: 35000,
      partsCost: 0,
      estimateMinutes: 40,
      evidenceCount: 1,
      priority: "medium",
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

async function seedInvoicesPayments({ order1, order2, order4, accountants, customers, walkIns }) {
  const displayId = (prefix, id) => `${prefix}-${String(id).slice(-6).toUpperCase()}`;
  const dueFrom = (issuedAt) => new Date(issuedAt.getTime() + 15 * DAY_MS);

  // Invoice 1 — order1 (brake job), paid in full same day. No linked quote:
  // walk-in customer, price agreed verbally at the counter.
  const invoice1IssuedAt = daysAgo(4);
  const invoice1 = await InvoiceModel.create({
    repairOrderId: order1._id,
    accountantId: accountants[0]._id,
    lineItems: [
      { description: "Front Brake Pad Replacement", quantity: 1, unitPrice: 180000, kind: "service", source: "quote" },
      { description: "Full Brake System Inspection", quantity: 1, unitPrice: 45000, kind: "service", source: "quote" },
    ],
    subtotal: 225000,
    discount: 0,
    taxAmount: 18000,
    total: 243000,
    amountPaid: 243000,
    status: "paid",
    issuedAt: invoice1IssuedAt,
    dueAt: dueFrom(invoice1IssuedAt),
  });

  // Invoice 2 — order2 (maintenance), synced 1:1 with its confirmed quote
  // (QT-10267: 5% discount, 8% tax) and partially paid — demonstrates the
  // accountant's "balance due" reconciliation against what was quoted.
  const invoice2IssuedAt = daysAgo(7);
  const invoice2 = await InvoiceModel.create({
    repairOrderId: order2._id,
    accountantId: accountants[1]._id,
    lineItems: [
      { description: "Scheduled Maintenance Package", quantity: 1, unitPrice: 210000, kind: "service", source: "quote" },
      { description: "Synthetic Oil Change", quantity: 1, unitPrice: 69000, kind: "service", source: "quote" },
    ],
    subtotal: 279000,
    discount: 14000,
    taxAmount: 21000,
    total: 286000,
    amountPaid: 150000,
    status: "partiallyPaid",
    issuedAt: invoice2IssuedAt,
    dueAt: dueFrom(invoice2IssuedAt),
    quoteId: order2.quoteId,
    quotedTotal: order2.quotedTotal,
  });

  // Invoice 3 — order4 (wheel alignment), invoiced three weeks ago, still
  // unpaid — now overdue. Carries one line added after the quote was
  // confirmed (source: additionalService), so the quoted-vs-actual delta has
  // a real explanation instead of looking like an unexplained mismatch.
  const invoice3IssuedAt = daysAgo(20);
  const invoice3 = await InvoiceModel.create({
    repairOrderId: order4._id,
    accountantId: accountants[0]._id,
    lineItems: [
      { description: "Wheel Alignment", quantity: 1, unitPrice: 99000, kind: "service", source: "quote" },
      { description: "Tire Rotation & Balancing", quantity: 1, unitPrice: 55000, kind: "service", source: "quote" },
      { description: "Wheel Bearing Inspection & Repack", quantity: 1, unitPrice: 35000, kind: "labor", source: "additionalService" },
    ],
    subtotal: 189000,
    discount: 0,
    taxAmount: 15000,
    total: 204000,
    amountPaid: 0,
    status: "unpaid",
    issuedAt: invoice3IssuedAt,
    dueAt: dueFrom(invoice3IssuedAt),
    quoteId: order4.quoteId,
    quotedTotal: order4.quotedTotal,
  });

  const payments = await PaymentModel.insertMany([
    {
      invoiceId: invoice1._id,
      customerId: walkIns[0]._id,
      amount: 243000,
      method: "card",
      gatewayRef: "MOCKPAY-88213",
      status: "succeeded",
      paidAt: invoice1IssuedAt,
    },
    {
      invoiceId: invoice2._id,
      customerId: walkIns[1]._id,
      amount: 150000,
      method: "cash",
      reference: "Deposit at pickup",
      status: "succeeded",
      paidAt: daysAgo(6),
    },
  ]);

  // Mirror the audit trail that generateInvoiceFromRepairOrder/recordPayment/
  // sendInvoiceToCustomer produce in real usage, so the Audit Trail screen
  // has real history on a fresh demo database instead of an empty state.
  await logAudit({
    action: "invoiceGenerated",
    actorId: accountants[0]._id,
    invoiceId: invoice1._id,
    repairOrderId: order1._id,
    details: `${displayId("INV", invoice1._id)} generated for 243.000 ₫`,
  });
  await logAudit({
    action: "paymentRecorded",
    actorId: accountants[0]._id,
    invoiceId: invoice1._id,
    repairOrderId: order1._id,
    details: "243.000 ₫ via card — paid in full",
  });
  await logAudit({
    action: "invoiceGenerated",
    actorId: accountants[1]._id,
    invoiceId: invoice2._id,
    repairOrderId: order2._id,
    details: `${displayId("INV", invoice2._id)} generated for 286.000 ₫`,
  });
  await logAudit({
    action: "paymentRecorded",
    actorId: accountants[1]._id,
    invoiceId: invoice2._id,
    repairOrderId: order2._id,
    details: "150.000 ₫ via cash — 136.000 ₫ remaining (ref Deposit at pickup)",
  });
  await logAudit({
    action: "invoiceGenerated",
    actorId: accountants[0]._id,
    invoiceId: invoice3._id,
    repairOrderId: order4._id,
    details: `${displayId("INV", invoice3._id)} generated for 204.000 ₫`,
  });
  await logAudit({
    action: "invoiceSent",
    actorId: accountants[0]._id,
    invoiceId: invoice3._id,
    repairOrderId: order4._id,
    details: `${displayId("INV", invoice3._id)} sent to ${customers[1].fullName}`,
  });

  console.log(`[seed] invoices: 3, payments: ${payments.length}`);
  return { invoice1, invoice2, invoice3 };
}

async function seedParts() {
  // costPrice (~60-70% of sell price) drives the gross-profit report; a couple
  // of items are stocked at or below their reorderPoint so the low-stock and
  // reorder-suggestion views have something to show.
  const parts = await PartModel.insertMany([
    { name: "Front Brake Pad Set", sku: "BRK-PAD-001", unitPrice: 65000, costPrice: 42000, stockQuantity: 42, reorderPoint: 10, maxStock: 60 },
    { name: "Brake Rotor (Front, Vented)", sku: "BRK-ROT-002", unitPrice: 120000, costPrice: 78000, stockQuantity: 18, reorderPoint: 6, maxStock: 30 },
    { name: "Ignition Coil", sku: "IGN-COIL-010", unitPrice: 85000, costPrice: 55000, stockQuantity: 25, reorderPoint: 8, maxStock: 40 },
    { name: "NGK Spark Plug (4-pack)", sku: "ENG-SPK-004", unitPrice: 32000, costPrice: 20000, stockQuantity: 60, reorderPoint: 15, maxStock: 100 },
    { name: "Synthetic Engine Oil 5W-30 (4L)", sku: "OIL-SYN-5W30", unitPrice: 55000, costPrice: 36000, stockQuantity: 80, reorderPoint: 20, maxStock: 120 },
    { name: "Oil Filter", sku: "OIL-FLT-001", unitPrice: 12000, costPrice: 7000, stockQuantity: 95, reorderPoint: 25, maxStock: 150 },
    { name: "Cabin Air Filter", sku: "AC-FLT-003", unitPrice: 18000, costPrice: 11000, stockQuantity: 50, reorderPoint: 15, maxStock: 80 },
    { name: "12V Car Battery (60Ah)", sku: "ELE-BAT-060", unitPrice: 175000, costPrice: 120000, stockQuantity: 5, reorderPoint: 6, maxStock: 20 },
    { name: "Wheel Bearing Kit (Front)", sku: "SUS-BRG-007", unitPrice: 95000, costPrice: 62000, stockQuantity: 16, reorderPoint: 5, maxStock: 25 },
    { name: "All-Season Tire 215/55R17", sku: "TIR-215-55R17", unitPrice: 210000, costPrice: 150000, stockQuantity: 28, reorderPoint: 8, maxStock: 40 },
    { name: "Wiper Blade Set", sku: "EXT-WPR-002", unitPrice: 15000, costPrice: 8000, stockQuantity: 4, reorderPoint: 10, maxStock: 80 },
    { name: "Coolant / Antifreeze (4L)", sku: "FLU-CLT-004", unitPrice: 28000, costPrice: 17000, stockQuantity: 40, reorderPoint: 12, maxStock: 60 },
  ]);
  console.log(`[seed] parts: ${parts.length}`);
  return parts;
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

/**
 * Populates the collections added across the transformation phases so the new
 * screens (Purchasing, Customer care) and reports have real data on a fresh
 * demo DB instead of empty states: suppliers + purchase orders (incl. payables),
 * declined work, reminders, follow-ups, odometer history and technician time.
 */
async function seedTransformationData({ vehicles, parts, repairOrders, customers, walkIns, technicians }) {
  const partBySku = Object.fromEntries(parts.map((p) => [p.sku, p]));
  const ym = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  // ----- Suppliers -----
  const suppliers = await SupplierModel.insertMany([
    { name: "AutoParts Vietnam Co.", code: "SUP-APV", contactName: "Trần Quốc Bảo", phone: "0281234501", email: "sales@autopartsvn.com", address: "12 Nguyễn Văn Linh, Q7, TP.HCM", taxCode: "0301234501", paymentTermDays: 30, leadTimeDays: 3 },
    { name: "Bosch Distributor HCM", code: "SUP-BOSCH", contactName: "Lê Thị Hồng", phone: "0282345602", email: "order@bosch-hcm.vn", address: "88 Điện Biên Phủ, Q3, TP.HCM", taxCode: "0301234502", paymentTermDays: 45, leadTimeDays: 5 },
    { name: "TirePro Wholesale", code: "SUP-TIRE", contactName: "Phạm Văn Cường", phone: "0283456703", email: "b2b@tirepro.vn", taxCode: "0301234503", paymentTermDays: 15, leadTimeDays: 2 },
    { name: "QuickLube Supplies", code: "SUP-QL", contactName: "Đỗ Minh Anh", phone: "0284567804", email: "hello@quicklube.vn", paymentTermDays: 30, leadTimeDays: 1 },
  ]);

  // Preferred supplier on the low-stock parts, so reorder suggestions show one.
  await PartModel.updateOne({ sku: "ELE-BAT-060" }, { supplierId: suppliers[0]._id });
  await PartModel.updateOne({ sku: "EXT-WPR-002" }, { supplierId: suppliers[3]._id });
  await PartModel.updateOne({ sku: "IGN-COIL-010" }, { supplierId: suppliers[1]._id });
  await PartModel.updateOne({ sku: "TIR-215-55R17" }, { supplierId: suppliers[2]._id });

  const poLine = (sku, quantity, unitCost, receivedQuantity = 0) => ({
    partId: partBySku[sku]._id,
    description: partBySku[sku].name,
    quantity,
    unitCost,
    receivedQuantity,
  });
  const sum = (lines) => lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  // ----- Purchase orders across the lifecycle (drives the Purchasing tabs) -----
  const po1Lines = [poLine("BRK-PAD-001", 20, 42000), poLine("OIL-SYN-5W30", 30, 36000)];
  const po3Lines = [poLine("TIR-215-55R17", 20, 150000, 8)];
  const po4Lines = [poLine("OIL-FLT-001", 50, 7000, 50)];
  const po5Lines = [poLine("ELE-BAT-060", 10, 120000, 10)];
  const po6Lines = [poLine("IGN-COIL-010", 15, 55000, 15)];

  const purchaseOrders = await PurchaseOrderModel.insertMany([
    // Draft — being assembled.
    { code: `PO-${ym}-00001`, supplierId: suppliers[0]._id, status: "draft", lines: po1Lines, subtotal: sum(po1Lines), amountDue: sum(po1Lines), amountPaid: 0, paymentStatus: "unpaid", expectedAt: daysFromNow(5) },
    // Sent — awaiting delivery.
    { code: `PO-${ym}-00002`, supplierId: suppliers[1]._id, status: "sent", lines: [poLine("BRK-ROT-002", 10, 78000)], subtotal: 780000, amountDue: 780000, amountPaid: 0, paymentStatus: "unpaid", expectedAt: daysFromNow(3) },
    // Partially received.
    { code: `PO-${ym}-00003`, supplierId: suppliers[2]._id, status: "partiallyReceived", lines: po3Lines, subtotal: sum(po3Lines), amountDue: sum(po3Lines), amountPaid: 0, paymentStatus: "unpaid", expectedAt: daysAgo(1) },
    // Received and paid in full.
    { code: `PO-${ym}-00004`, supplierId: suppliers[3]._id, status: "received", lines: po4Lines, subtotal: sum(po4Lines), amountDue: sum(po4Lines), amountPaid: sum(po4Lines), paymentStatus: "paid", expectedAt: daysAgo(12), dueAt: daysAgo(10) },
    // Received, unpaid and now overdue — shows in payables ageing.
    { code: `PO-${ym}-00005`, supplierId: suppliers[0]._id, status: "received", lines: po5Lines, subtotal: sum(po5Lines), amountDue: sum(po5Lines), amountPaid: 0, paymentStatus: "unpaid", expectedAt: daysAgo(45), dueAt: daysAgo(40) },
    // Received, partially paid.
    { code: `PO-${ym}-00006`, supplierId: suppliers[1]._id, status: "received", lines: po6Lines, subtotal: sum(po6Lines), amountDue: sum(po6Lines), amountPaid: 400000, paymentStatus: "partiallyPaid", expectedAt: daysAgo(8), dueAt: daysAgo(5) },
  ]);

  // ----- Declined work (Customer care › Deferred work) -----
  const deferred = await DeferredWorkModel.insertMany([
    { vehicleId: vehicles[0]._id, customerId: customers[0]._id, description: "New Tire Set Installation", estimatedPrice: 480000, declineReason: "Too expensive right now", priority: "high", status: "open", remindAt: daysFromNow(30) },
    { vehicleId: vehicles[2]._id, customerId: customers[1]._id, description: "Brake Rotor Resurfacing", estimatedPrice: 140000, declineReason: "Doing it next service", priority: "medium", status: "open", remindAt: daysFromNow(15) },
    { vehicleId: vehicles[8]._id, customerId: walkIns[1]._id, description: "Cabin Air Filter Replacement", estimatedPrice: 35000, declineReason: "Will do later", priority: "low", status: "open", remindAt: daysFromNow(20) },
    { vehicleId: vehicles[5]._id, customerId: customers[5]._id, description: "Transmission Fluid Service", estimatedPrice: 150000, declineReason: "Checking with the family", priority: "medium", status: "open", remindAt: daysFromNow(45) },
  ]);

  // ----- Renewal dates on a few vehicles (so reminders can be generated too) -----
  await VehicleModel.updateOne({ _id: vehicles[0]._id }, { registrationExpiry: daysFromNow(20), insuranceExpiry: daysFromNow(55) });
  await VehicleModel.updateOne({ _id: vehicles[1]._id }, { insuranceExpiry: daysFromNow(12) });
  await VehicleModel.updateOne({ _id: vehicles[2]._id }, { registrationExpiry: daysFromNow(40), insuranceExpiry: daysFromNow(8) });
  await VehicleModel.updateOne({ _id: vehicles[3]._id }, { registrationExpiry: daysFromNow(5) });

  // ----- Reminders (Customer care › Reminders), pending -----
  const reminders = await ReminderModel.insertMany([
    { vehicleId: vehicles[0]._id, customerId: customers[0]._id, type: "registrationExpiry", dueAt: daysFromNow(20), title: "Đăng kiểm sắp hết hạn", message: "Đăng kiểm xe sắp hết hạn trong ~20 ngày.", status: "pending" },
    { vehicleId: vehicles[1]._id, customerId: customers[0]._id, type: "insuranceExpiry", dueAt: daysFromNow(12), title: "Bảo hiểm sắp hết hạn", message: "Bảo hiểm xe sắp hết hạn trong ~12 ngày.", status: "pending" },
    { vehicleId: vehicles[2]._id, customerId: customers[1]._id, type: "insuranceExpiry", dueAt: daysFromNow(8), title: "Bảo hiểm sắp hết hạn", message: "Bảo hiểm xe sắp hết hạn trong ~8 ngày.", status: "pending" },
    { vehicleId: vehicles[0]._id, customerId: customers[0]._id, type: "deferredWork", dueAt: daysFromNow(30), title: "Nhắc hạng mục đã hoãn", message: "Khách đã hoãn: New Tire Set Installation.", status: "pending", sourceRef: deferred[0]._id },
    { vehicleId: vehicles[3]._id, customerId: customers[3]._id, type: "maintenanceDue", dueAt: daysFromNow(5), title: "Đến kỳ bảo dưỡng", message: "Xe đã quá 6 tháng kể từ lần bảo dưỡng gần nhất.", status: "pending" },
    { vehicleId: vehicles[7]._id, customerId: walkIns[0]._id, type: "warrantyExpiry", dueAt: daysFromNow(7), title: "Bảo hành dịch vụ sắp hết", message: "Bảo hành lần sửa phanh gần nhất sắp hết hạn.", status: "pending" },
  ]);

  // ----- Follow-ups (Customer care › Follow-ups) -----
  const followUps = await FollowUpModel.insertMany([
    { repairOrderId: repairOrders[0]._id, vehicleId: vehicles[7]._id, customerId: walkIns[0]._id, dueAt: daysAgo(1), status: "pending" },
    { repairOrderId: repairOrders[1]._id, vehicleId: vehicles[8]._id, customerId: walkIns[1]._id, dueAt: daysAgo(4), status: "contacted", contactedAt: daysAgo(4), csatScore: 4, npsScore: 8, complaintCategory: "timeliness", note: "Hài lòng, chỉ góp ý giao xe hơi trễ hẹn." },
    { repairOrderId: repairOrders[3]._id, vehicleId: vehicles[2]._id, customerId: customers[1]._id, dueAt: daysAgo(17), status: "contacted", contactedAt: daysAgo(17), csatScore: 5, npsScore: 10, complaintCategory: "none", note: "Rất hài lòng." },
    { repairOrderId: repairOrders[7]._id, vehicleId: vehicles[3]._id, customerId: customers[3]._id, dueAt: daysFromNow(2), status: "pending" },
  ]);

  // ----- Odometer history on a couple of vehicles -----
  await OdometerLogModel.insertMany([
    { vehicleId: vehicles[0]._id, mileage: 20000, source: "reception", recordedAt: daysAgo(200) },
    { vehicleId: vehicles[0]._id, mileage: 24000, source: "reception", recordedAt: daysAgo(90) },
    { vehicleId: vehicles[0]._id, mileage: 24680, source: "inspection", recordedAt: daysAgo(1) },
    { vehicleId: vehicles[7]._id, mileage: 51000, source: "reception", recordedAt: daysAgo(120) },
    { vehicleId: vehicles[7]._id, mileage: 58500, source: "reception", recordedAt: daysAgo(4) },
  ]);

  // ----- Technician labour cost + logged time (feeds gross-profit + KPIs) -----
  await UserModel.updateOne({ _id: technicians[0]._id }, { hourlyCost: 55000 });
  await UserModel.updateOne({ _id: technicians[1]._id }, { hourlyCost: 50000 });
  await TimeLogModel.insertMany([
    { repairOrderId: repairOrders[0]._id, technicianId: technicians[0]._id, startedAt: daysAgo(5), endedAt: daysAgo(5), durationMinutes: 90 },
    { repairOrderId: repairOrders[1]._id, technicianId: technicians[1]._id, startedAt: daysAgo(8), endedAt: daysAgo(8), durationMinutes: 120 },
    { repairOrderId: repairOrders[7]._id, technicianId: technicians[0]._id, startedAt: hoursAgo(4), endedAt: hoursAgo(3), durationMinutes: 55 },
  ]);

  console.log(
    `[seed] suppliers: ${suppliers.length}, purchase orders: ${purchaseOrders.length}, deferred work: ${deferred.length}, reminders: ${reminders.length}, follow-ups: ${followUps.length}`
  );
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
  await seedInvoicesPayments({ order1, order2, order4, accountants, customers, walkIns });
  const parts = await seedParts();
  await seedTransformationData({ vehicles, parts, repairOrders, customers, walkIns, technicians });
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
