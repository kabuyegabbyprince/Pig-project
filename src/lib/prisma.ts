import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ============================================================================
// Model <-> Supabase Table & Column Mappings (matching prisma/schema.prisma)
// ============================================================================

const TABLE_MAP: Record<string, string> = {
  teamMember: "team_members",
  galleryItem: "gallery_items",
  websiteContent: "website_content",
  user: "users",
  userLocationAccess: "UserLocationAccess",
  district: "District",
  sector: "Sector",
  cell: "Cell",
  village: "Village",
  beneficiary: "Beneficiary",
  pig: "Pig",
  pigDistribution: "PigDistribution",
  pigReturn: "PigReturn",
  revolvingCycle: "RevolvingCycle",
  pigTransfer: "PigTransfer",
  litter: "Litter",
  piglet: "Piglet",
  veterinaryExamination: "VeterinaryExamination",
  vaccination: "Vaccination",
  treatment: "Treatment",
  mortalityRecord: "MortalityRecord",
  notification: "Notification",
  auditLog: "AuditLog",
  systemSetting: "SystemSetting",
  financeTransaction: "FinanceTransaction",
  repayment: "Repayment",
  redistribution: "Redistribution",
  veterinaryRecord: "VeterinaryRecord",
  veterinaryVisit: "VeterinaryVisit",
  fieldVisit: "FieldVisit",
  task: "Task",
  oTP: "OTP",
  otp: "OTP",
  document: "Document",
  employeeReport: "EmployeeReport",
  comment: "Comment",
  backendUser: "users",
  storeProduct: "store_products",
  storeOrder: "store_orders",
  storeOrderItem: "store_order_items",
  cooperativeStockReport: "cooperative_stock_reports",
  cellFeedSale: "cell_feed_sales",
  cooperative: "cooperatives",
  cooperativeMemberReport: "cooperative_member_reports",
  cooperativeMemberPayment: "cooperative_member_payments",
};

const FIELD_TO_COL: Record<string, Record<string, string>> = {
  teamMember: {
    fullName: "full_name",
    photoUrl: "photo_url",
    linkedinUrl: "linkedin_url",
    displayOrder: "display_order",
    isPublished: "is_published",
    isFeatured: "is_featured",
    showEmailPublic: "show_email_public",
    showPhonePublic: "show_phone_public",
    showLinkedinPublic: "show_linkedin_public",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  galleryItem: {
    imageUrl: "image_url",
    photoDate: "photo_date",
    displayOrder: "display_order",
    isPublished: "is_published",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  websiteContent: {
    primaryButtonText: "primary_button_text",
    primaryButtonLink: "primary_button_link",
    secondaryButtonText: "secondary_button_text",
    secondaryButtonLink: "secondary_button_link",
    imageUrl: "image_url",
    imageAlt: "image_alt",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  user: {
    cooperativeId: "cooperative_id",
    mustChangePassword: "must_change_password",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  beneficiary: {
    beneficiaryNumber: "beneficiaryId",
    districtStr: "district",
    sectorStr: "sector",
    cellStr: "cell",
    villageStr: "village",
    registrationDate: "dateJoined",
    createdById: "fieldOfficerId",
  },
  pig: {
    tagNumber: "pigId",
    currentBeneficiaryId: "beneficiaryId",
    cooperativeId: "cooperative_id",
    ownerMemberId: "owner_member_id",
    ownerMemberName: "owner_member_name",
    pigType: "pig_type",
    daysAge: "days_age",
    batchCode: "batch_code",
    stockedByFinanceId: "stocked_by_finance_id",
    legacyHealthStatus: "healthStatusStr",
  },
  pigDistribution: {
    distributionDate: "date",
  },
  pigTransfer: {
    previousBeneficiaryId: "fromBeneficiaryId",
    newBeneficiaryId: "toBeneficiaryId",
    transferDate: "date",
  },
  litter: {
    motherPigId: "pigId",
    actualBirthDate: "dateOfBirth",
    numberBorn: "numberOfPigletsBorn",
    numberAlive: "numberSurvived",
    numberDead: "numberLost",
  },
  piglet: {
    tagNumber: "pigletId",
  },
  mortalityRecord: {
    reportedById: "recordedById",
    deathDate: "date",
    reviewedById: "approvedById",
  },
  notification: {
    relatedEntity: "relatedEntityType",
  },
  auditLog: {
    entity: "entityType",
    previousValue: "oldValue",
  },
  financeTransaction: {
    reference: "category",
    recordedById: "createdById",
    transactionDate: "date",
  },
  backendUser: {
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  storeProduct: {
    isNegotiable: "is_negotiable",
    discountPercent: "discount_percent",
    discountPrice: "discount_price",
    discountLabel: "discount_label",
    discountStartsAt: "discount_starts_at",
    discountEndsAt: "discount_ends_at",
    lowStockThreshold: "low_stock_threshold",
    storeSection: "store_section",
    pigId: "pig_id",
    sourcePigTag: "source_pig_tag",
  },
  storeOrder: {
    orderNumber: "order_number",
    customerName: "customer_name",
    customerEmail: "customer_email",
    customerPhone: "customer_phone",
    shippingAddress: "shipping_address",
    subtotalAmount: "subtotal_amount",
    discountTotal: "discount_total",
    totalAmount: "total_amount",
    paymentMethod: "payment_method",
    paymentReference: "payment_reference",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  storeOrderItem: {
    orderId: "order_id",
    productId: "product_id",
    originalPrice: "original_price",
    discountAmount: "discount_amount",
  },
  cooperativeStockReport: {
    reportedById: "reported_by_id",
    reportedByName: "reported_by_name",
    cooperativeOwnerName: "cooperative_owner_name",
    cooperativeOwnerRole: "cooperative_owner_role",
    cellName: "cell_name",
    animalTitle: "animal_title",
    pigCount: "pig_count",
    estimatedWeightKg: "estimated_weight_kg",
    suggestedPrice: "suggested_price",
    pigId: "pig_id",
    sourcePigTag: "source_pig_tag",
    listedProductId: "listed_product_id",
    reviewedById: "reviewed_by_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  cellFeedSale: {
    saleNumber: "sale_number",
    productId: "product_id",
    productName: "product_name",
    buyerName: "buyer_name",
    buyerPhone: "buyer_phone",
    unitPrice: "unit_price",
    totalAmount: "total_amount",
    paymentMethod: "payment_method",
    soldById: "sold_by_id",
    soldByName: "sold_by_name",
    cellName: "cell_name",
    financeTransactionId: "finance_transaction_id",
    verificationStatus: "verification_status",
    verifiedById: "verified_by_id",
    verifiedAt: "verified_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  cooperative: {
    cellName: "cell_name",
    maxMembers: "max_members",
    leaderUserId: "leader_user_id",
    leaderName: "leader_name",
    createdById: "created_by_id",
    createdByName: "created_by_name",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  cooperativeMemberReport: {
    cooperativeId: "cooperative_id",
    cooperativeName: "cooperative_name",
    memberId: "member_id",
    memberName: "member_name",
    leaderId: "leader_id",
    leaderName: "leader_name",
    pigId: "pig_id",
    pigTag: "pig_tag",
    reportType: "report_type",
    animalCount: "animal_count",
    estimatedWeightKg: "estimated_weight_kg",
    leaderNotes: "leader_notes",
    reviewedAt: "reviewed_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  cooperativeMemberPayment: {
    memberId: "member_id",
    cooperativeId: "cooperative_id",
    pigValueFee: "pig_value_fee",
    taxFee: "tax_fee",
    totalAmount: "total_amount",
    momoReference: "momo_reference",
    verifiedById: "verified_by_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
};

const MODELS_WITH_UPDATED_AT = new Set([
  "teamMember",
  "galleryItem",
  "websiteContent",
  "user",
  "district",
  "sector",
  "cell",
  "village",
  "beneficiary",
  "pig",
  "revolvingCycle",
  "pigTransfer",
  "litter",
  "piglet",
  "veterinaryExamination",
  "treatment",
  "mortalityRecord",
  "systemSetting",
  "financeTransaction",
  "repayment",
  "veterinaryRecord",
  "veterinaryVisit",
  "fieldVisit",
  "task",
  "employeeReport",
  "comment",
  "backendUser",
  "storeProduct",
  "storeOrder",
  "cooperativeStockReport",
  "cellFeedSale",
  "cooperative",
  "cooperativeMemberReport",
  "cooperativeMemberPayment",
]);

const DECIMAL_FIELDS = new Set([
  "amount",
  "purchasePrice",
  "price",
  "discountPercent",
  "discountPrice",
  "subtotalAmount",
  "discountTotal",
  "totalAmount",
  "originalPrice",
  "discountAmount",
  "estimatedWeightKg",
  "suggestedPrice",
  "unitPrice",
  "pigValueFee",
  "taxFee",
]);

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "lastLoginAt",
  "emailVerified",
  "phoneVerified",
  "registrationDate",
  "dateReceived",
  "dateOfBirth",
  "expectedDelivery",
  "dateOfDelivery",
  "distributionDate",
  "returnDate",
  "startDate",
  "endDate",
  "dueDate",
  "transferDate",
  "pregnancyDate",
  "expectedBirthDate",
  "actualBirthDate",
  "birthDate",
  "returnedDate",
  "redistributedAt",
  "examinationDate",
  "followUpDate",
  "vaccinationDate",
  "nextDueDate",
  "deathDate",
  "reviewedAt",
  "readAt",
  "transactionDate",
  "approvedAt",
  "completedAt",
  "photoDate",
  "nextVisitDate",
  "replyDate",
  "date",
  "expiresAt",
  "usedAt",
  "discountStartsAt",
  "discountEndsAt",
  "verifiedAt",
]);

type RelationSpec = {
  type: "one" | "many";
  targetModel: string;
  localField: string;
  foreignField: string;
};

const RELATIONS: Record<string, Record<string, RelationSpec>> = {
  auditLog: {
    user: { type: "one", targetModel: "user", localField: "userId", foreignField: "id" },
  },
  pig: {
    currentBeneficiary: { type: "one", targetModel: "beneficiary", localField: "currentBeneficiaryId", foreignField: "id" },
    distributions: { type: "many", targetModel: "pigDistribution", localField: "id", foreignField: "pigId" },
    returns: { type: "many", targetModel: "pigReturn", localField: "id", foreignField: "pigId" },
    vetVisits: { type: "many", targetModel: "veterinaryVisit", localField: "id", foreignField: "pigId" },
    treatments: { type: "many", targetModel: "treatment", localField: "id", foreignField: "pigId" },
    veterinaryExams: { type: "many", targetModel: "veterinaryExamination", localField: "id", foreignField: "pigId" },
    storeProducts: { type: "many", targetModel: "storeProduct", localField: "id", foreignField: "pigId" },
  },
  beneficiary: {
    pigs: { type: "many", targetModel: "pig", localField: "id", foreignField: "currentBeneficiaryId" },
    distributions: { type: "many", targetModel: "pigDistribution", localField: "id", foreignField: "beneficiaryId" },
    returns: { type: "many", targetModel: "pigReturn", localField: "id", foreignField: "beneficiaryId" },
    revolvingCycles: { type: "many", targetModel: "revolvingCycle", localField: "id", foreignField: "beneficiaryId" },
    legacyReturns: { type: "many", targetModel: "piglet", localField: "id", foreignField: "returnedFromId" },
    fieldVisits: { type: "many", targetModel: "fieldVisit", localField: "id", foreignField: "beneficiaryId" },
    createdBy: { type: "one", targetModel: "user", localField: "createdById", foreignField: "id" },
  },
  pigDistribution: {
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    beneficiary: { type: "one", targetModel: "beneficiary", localField: "beneficiaryId", foreignField: "id" },
    distributedBy: { type: "one", targetModel: "user", localField: "distributedById", foreignField: "id" },
  },
  pigReturn: {
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    beneficiary: { type: "one", targetModel: "beneficiary", localField: "beneficiaryId", foreignField: "id" },
    recordedBy: { type: "one", targetModel: "user", localField: "recordedById", foreignField: "id" },
  },
  revolvingCycle: {
    beneficiary: { type: "one", targetModel: "beneficiary", localField: "beneficiaryId", foreignField: "id" },
  },
  fieldVisit: {
    beneficiary: { type: "one", targetModel: "beneficiary", localField: "beneficiaryId", foreignField: "id" },
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    fieldOfficer: { type: "one", targetModel: "user", localField: "fieldOfficerId", foreignField: "id" },
  },
  task: {
    assignedUser: { type: "one", targetModel: "user", localField: "assignedUserId", foreignField: "id" },
    beneficiary: { type: "one", targetModel: "beneficiary", localField: "beneficiaryId", foreignField: "id" },
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
  },
  pigTransfer: {
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    previousBeneficiary: { type: "one", targetModel: "beneficiary", localField: "previousBeneficiaryId", foreignField: "id" },
    newBeneficiary: { type: "one", targetModel: "beneficiary", localField: "newBeneficiaryId", foreignField: "id" },
    requestedBy: { type: "one", targetModel: "user", localField: "requestedById", foreignField: "id" },
  },
  litter: {
    motherPig: { type: "one", targetModel: "pig", localField: "motherPigId", foreignField: "id" },
    piglets: { type: "many", targetModel: "piglet", localField: "id", foreignField: "litterId" },
  },
  district: {
    sectors: { type: "many", targetModel: "sector", localField: "id", foreignField: "districtId" },
  },
  sector: {
    district: { type: "one", targetModel: "district", localField: "districtId", foreignField: "id" },
    cells: { type: "many", targetModel: "cell", localField: "id", foreignField: "sectorId" },
  },
  cell: {
    sector: { type: "one", targetModel: "sector", localField: "sectorId", foreignField: "id" },
    villages: { type: "many", targetModel: "village", localField: "id", foreignField: "cellId" },
  },
  village: {
    cell: { type: "one", targetModel: "cell", localField: "cellId", foreignField: "id" },
  },
  financeTransaction: {
    beneficiary: { type: "one", targetModel: "beneficiary", localField: "beneficiaryId", foreignField: "id" },
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    recordedBy: { type: "one", targetModel: "user", localField: "recordedById", foreignField: "id" },
    approvedBy: { type: "one", targetModel: "user", localField: "approvedById", foreignField: "id" },
  },
  veterinaryRecord: {
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    veterinarian: { type: "one", targetModel: "user", localField: "veterinarianId", foreignField: "id" },
  },
  veterinaryVisit: {
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    veterinarian: { type: "one", targetModel: "user", localField: "veterinarianId", foreignField: "id" },
  },
  employeeReport: {
    employee: { type: "one", targetModel: "user", localField: "employeeId", foreignField: "id" },
  },
  storeProduct: {
    pig: { type: "one", targetModel: "pig", localField: "pigId", foreignField: "id" },
    orderItems: { type: "many", targetModel: "storeOrderItem", localField: "id", foreignField: "productId" },
    stockReports: { type: "many", targetModel: "cooperativeStockReport", localField: "id", foreignField: "listedProductId" },
    feedSales: { type: "many", targetModel: "cellFeedSale", localField: "id", foreignField: "productId" },
  },
  storeOrder: {
    items: { type: "many", targetModel: "storeOrderItem", localField: "id", foreignField: "orderId" },
  },
  storeOrderItem: {
    order: { type: "one", targetModel: "storeOrder", localField: "orderId", foreignField: "id" },
    product: { type: "one", targetModel: "storeProduct", localField: "productId", foreignField: "id" },
  },
  cooperativeStockReport: {
    listedProduct: { type: "one", targetModel: "storeProduct", localField: "listedProductId", foreignField: "id" },
  },
  cellFeedSale: {
    product: { type: "one", targetModel: "storeProduct", localField: "productId", foreignField: "id" },
  },
  cooperative: {
    reports: { type: "many", targetModel: "cooperativeMemberReport", localField: "id", foreignField: "cooperativeId" },
  },
  cooperativeMemberReport: {
    cooperative: { type: "one", targetModel: "cooperative", localField: "cooperativeId", foreignField: "id" },
  },
};

function toCol(model: string, field: string): string {
  return FIELD_TO_COL[model]?.[field] ?? field;
}

function getReverseMap(model: string): Record<string, string> {
  const map = FIELD_TO_COL[model];
  if (!map) return {};
  const rev: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    rev[v] = k;
  }
  return rev;
}

const USER_VIRTUAL_FIELDS = new Set([
  "isActive",
  "deletedAt",
  "lastLoginAt",
  "accessLevel",
  "assignedDistrictId",
  "assignedSectorId",
  "assignedCellId",
  "assignedVillageId",
  "emailVerified",
  "phoneVerified",
]);

function mapRowFromDb(model: string, row: Record<string, unknown>): Record<string, unknown> {
  const rev = getReverseMap(model);
  const out: Record<string, unknown> = {};
  for (const [col, val] of Object.entries(row)) {
    const field = rev[col] ?? col;
    if (val === null || val === undefined) {
      out[field] = val;
    } else if (DECIMAL_FIELDS.has(field)) {
      out[field] = new Prisma.Decimal(typeof val === "number" || typeof val === "string" ? val : String(val));
    } else if (DATE_FIELDS.has(field) && typeof val === "string") {
      const parsed = new Date(val);
      out[field] = Number.isNaN(parsed.getTime()) ? val : parsed;
    } else {
      out[field] = val;
    }
  }

  if (model === "user" || model === "backendUser") {
    if (out.id !== undefined && out.id !== null) {
      out.id = String(out.id);
    }
    const statusUpper = String(out.status ?? "ACTIVE").toUpperCase();
    out.isActive = statusUpper === "ACTIVE";
    out.deletedAt =
      statusUpper === "DELETED"
        ? out.updatedAt instanceof Date
          ? out.updatedAt
          : new Date()
        : null;
    if (!("lastLoginAt" in out)) out.lastLoginAt = null;
    if (!("accessLevel" in out)) out.accessLevel = "ALL";
    if (!("assignedDistrictId" in out)) out.assignedDistrictId = null;
    if (!("assignedSectorId" in out)) out.assignedSectorId = null;
    if (!("assignedCellId" in out)) out.assignedCellId = null;
    if (!("assignedVillageId" in out)) out.assignedVillageId = null;
    if (!("cooperativeId" in out)) out.cooperativeId = null;
    if (!("mustChangePassword" in out)) out.mustChangePassword = false;
  }

  if (model === "pig") {
    if (!("cooperativeId" in out)) out.cooperativeId = null;
    if (!("ownerMemberId" in out)) out.ownerMemberId = null;
    if (!("ownerMemberName" in out)) out.ownerMemberName = null;
    if (!("batchCode" in out)) out.batchCode = null;
  }

  return out;
}

function serializeValueForDb(val: unknown): unknown {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (val instanceof Date) return val.toISOString();
  if (val instanceof Prisma.Decimal) return val.toString();
  if (typeof val === "object" && val !== null && "toFixed" in val && typeof (val as { toString: () => string }).toString === "function") {
    return (val as { toString: () => string }).toString();
  }
  return val;
}

function mapDataToDb(model: string, data: Record<string, unknown>, isCreate = false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const rels = RELATIONS[model] ?? {};
  const isUsersTable = model === "user" || model === "backendUser";

  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    // Handle nested connect syntax e.g. { user: { connect: { id: '...' } } }
    if (key in rels && val && typeof val === "object" && "connect" in val) {
      const connectObj = (val as { connect?: Record<string, unknown> }).connect;
      const spec = rels[key];
      if (connectObj && spec.foreignField in connectObj) {
        out[toCol(model, spec.localField)] = connectObj[spec.foreignField];
      }
      continue;
    }
    if (key in rels) continue;
    if (isUsersTable && USER_VIRTUAL_FIELDS.has(key)) continue;

    // Handle Prisma atomic increment/decrement objects on update
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof Prisma.Decimal)) {
      if ("set" in val) {
        out[toCol(model, key)] = serializeValueForDb((val as { set: unknown }).set);
        continue;
      }
    }

    out[toCol(model, key)] = serializeValueForDb(val);
  }

  if (isUsersTable) {
    if (data.deletedAt !== undefined && data.deletedAt !== null) {
      out.status = "DELETED";
    } else if (typeof data.isActive === "boolean") {
      out.status = data.isActive ? "ACTIVE" : "SUSPENDED";
    } else if (data.deletedAt === null && !("status" in out)) {
      out.status = "ACTIVE";
    } else if (isCreate && !("status" in out)) {
      out.status = "ACTIVE";
    }
  }

  if (isCreate) {
    if (!("id" in out) && !isUsersTable) {
      out.id = randomUUID();
    }
    const nowIso = new Date().toISOString();
    if (isUsersTable) {
      const createdCol = toCol(model, "createdAt");
      if (!(createdCol in out)) {
        out[createdCol] = nowIso;
      }
    }
    if (MODELS_WITH_UPDATED_AT.has(model)) {
      const updatedCol = toCol(model, "updatedAt");
      if (!(updatedCol in out)) {
        out[updatedCol] = nowIso;
      }
    }
  } else if (MODELS_WITH_UPDATED_AT.has(model)) {
    const updatedCol = toCol(model, "updatedAt");
    if (!(updatedCol in out)) {
      out[updatedCol] = new Date().toISOString();
    }
  }

  return out;
}

function flattenWhere(where?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!where) return undefined;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(where)) {
    // Handle compound unique keys like page_section: { page: 'home', section: 'hero' }
    if (
      k.includes("_") &&
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      !("in" in v || "not" in v || "gte" in v || "gt" in v || "lte" in v || "lt" in v || "contains" in v || "startsWith" in v || "endsWith" in v || "notIn" in v)
    ) {
      for (const [subK, subV] of Object.entries(v as Record<string, unknown>)) {
        result[subK] = subV;
      }
    } else {
      result[k] = v;
    }
  }
  return result;
}

function normalizeComparable(val: unknown): unknown {
  if (val instanceof Date) return val.getTime();
  if (val instanceof Prisma.Decimal) return Number(val.toString());
  return val;
}

function matchesCondition(rowVal: unknown, cond: unknown): boolean {
  if (cond === undefined) return true;
  if (cond === null) return rowVal === null || rowVal === undefined;

  if (typeof cond === "object" && cond !== null && !(cond instanceof Date) && !(cond instanceof Prisma.Decimal) && !Array.isArray(cond)) {
    const obj = cond as Record<string, unknown>;
    const normRow = normalizeComparable(rowVal);

    if ("equals" in obj) {
      if (obj.equals === null) return rowVal === null || rowVal === undefined;
      return normRow === normalizeComparable(obj.equals);
    }
    if ("not" in obj) {
      if (obj.not === null) return rowVal !== null && rowVal !== undefined;
      if (typeof obj.not === "object") return !matchesCondition(rowVal, obj.not);
      return normRow !== normalizeComparable(obj.not);
    }
    if ("in" in obj && Array.isArray(obj.in)) {
      const list = obj.in.map(normalizeComparable);
      return list.includes(normRow);
    }
    if ("notIn" in obj && Array.isArray(obj.notIn)) {
      const list = obj.notIn.map(normalizeComparable);
      return !list.includes(normRow);
    }
    if ("gte" in obj && obj.gte !== undefined) {
      if (normRow === null || normRow === undefined) return false;
      if ((normRow as number | string) < (normalizeComparable(obj.gte) as number | string)) return false;
    }
    if ("gt" in obj && obj.gt !== undefined) {
      if (normRow === null || normRow === undefined) return false;
      if ((normRow as number | string) <= (normalizeComparable(obj.gt) as number | string)) return false;
    }
    if ("lte" in obj && obj.lte !== undefined) {
      if (normRow === null || normRow === undefined) return false;
      if ((normRow as number | string) > (normalizeComparable(obj.lte) as number | string)) return false;
    }
    if ("lt" in obj && obj.lt !== undefined) {
      if (normRow === null || normRow === undefined) return false;
      if ((normRow as number | string) >= (normalizeComparable(obj.lt) as number | string)) return false;
    }
    if ("contains" in obj && typeof obj.contains === "string") {
      if (typeof rowVal !== "string") return false;
      const insensitive = obj.mode === "insensitive";
      const hay = insensitive ? rowVal.toLowerCase() : rowVal;
      const needle = insensitive ? obj.contains.toLowerCase() : obj.contains;
      if (!hay.includes(needle)) return false;
    }
    if ("startsWith" in obj && typeof obj.startsWith === "string") {
      if (typeof rowVal !== "string") return false;
      const insensitive = obj.mode === "insensitive";
      const hay = insensitive ? rowVal.toLowerCase() : rowVal;
      const needle = insensitive ? obj.startsWith.toLowerCase() : obj.startsWith;
      if (!hay.startsWith(needle)) return false;
    }
    if ("endsWith" in obj && typeof obj.endsWith === "string") {
      if (typeof rowVal !== "string") return false;
      const insensitive = obj.mode === "insensitive";
      const hay = insensitive ? rowVal.toLowerCase() : rowVal;
      const needle = insensitive ? obj.endsWith.toLowerCase() : obj.endsWith;
      if (!hay.endsWith(needle)) return false;
    }
    return true;
  }

  return normalizeComparable(rowVal) === normalizeComparable(cond);
}

function matchesWhere(row: Record<string, unknown>, where?: Record<string, unknown>): boolean {
  const flat = flattenWhere(where);
  if (!flat) return true;

  for (const [key, cond] of Object.entries(flat)) {
    if (cond === undefined) continue;
    if (key === "AND" && Array.isArray(cond)) {
      if (!cond.every((sub) => matchesWhere(row, sub as Record<string, unknown>))) return false;
      continue;
    }
    if (key === "OR" && Array.isArray(cond)) {
      if (!cond.some((sub) => matchesWhere(row, sub as Record<string, unknown>))) return false;
      continue;
    }
    if (key === "NOT") {
      if (Array.isArray(cond)) {
        if (cond.some((sub) => matchesWhere(row, sub as Record<string, unknown>))) return false;
      } else if (cond && typeof cond === "object") {
        if (matchesWhere(row, cond as Record<string, unknown>)) return false;
      }
      continue;
    }

    if (!matchesCondition(row[key], cond)) return false;
  }

  return true;
}

function sortRows(rows: Record<string, unknown>[], orderBy?: unknown): Record<string, unknown>[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  const entries = specs.flatMap((s) => (s && typeof s === "object" ? Object.entries(s as Record<string, unknown>) : []));
  if (entries.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = normalizeComparable(a[field]);
      const bv = normalizeComparable(b[field]);
      if (av === bv) continue;
      if (av === null || av === undefined) return dir === "asc" ? -1 : 1;
      if (bv === null || bv === undefined) return dir === "asc" ? 1 : -1;
      const cmp = (av as number | string) < (bv as number | string) ? -1 : 1;
      return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function applySelect(row: Record<string, unknown>, select?: Record<string, unknown>): Record<string, unknown> {
  if (!select) return row;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) {
      out[k] = row[k];
    } else if (v && typeof v === "object" && k in row) {
      const val = row[k];
      if (Array.isArray(val)) {
        const subSelect = (v as { select?: Record<string, unknown> }).select;
        out[k] = subSelect ? val.map((item) => applySelect(item as Record<string, unknown>, subSelect)) : val;
      } else if (val && typeof val === "object") {
        const subSelect = (v as { select?: Record<string, unknown> }).select;
        out[k] = subSelect ? applySelect(val as Record<string, unknown>, subSelect) : val;
      } else {
        out[k] = val;
      }
    }
  }
  return out;
}

// ============================================================================
// Supabase PostgREST Transport
// ============================================================================

export class SupabaseTableMissingError extends Error {
  table: string;
  constructor(table: string) {
    super(`Table "${table}" is not yet provisioned in Supabase.`);
    this.name = "SupabaseTableMissingError";
    this.table = table;
  }
}

export function isSupabaseTableMissingError(err: unknown): boolean {
  return (
    err instanceof SupabaseTableMissingError ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name?: string }).name === "SupabaseTableMissingError")
  );
}

export function isSupabaseSchemaMissingError(err: unknown): boolean {
  if (isSupabaseTableMissingError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("42703") ||
    msg.includes("PGRST204") ||
    msg.includes("PGRST205") ||
    msg.includes("does not exist") ||
    msg.includes("Could not find the")
  );
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function buildPostgrestFilters(model: string, where?: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  const flat = flattenWhere(where);
  if (!flat) return params;
  const isUsersTable = model === "user" || model === "backendUser";

  for (const [field, cond] of Object.entries(flat)) {
    if (cond === undefined || field === "OR" || field === "AND" || field === "NOT") continue;
    const rels = RELATIONS[model] ?? {};
    if (field in rels) continue;
    if (isUsersTable && USER_VIRTUAL_FIELDS.has(field)) continue;

    if (isUsersTable && field === "id") {
      if (typeof cond === "string" || typeof cond === "number") {
        const s = String(cond).trim();
        params.append("id", /^\d+$/.test(s) ? `eq.${s}` : "eq.-1");
        continue;
      }
      if (typeof cond === "object" && cond !== null && "in" in cond && Array.isArray((cond as { in: unknown[] }).in)) {
        const validIds = (cond as { in: unknown[] }).in
          .map((v) => String(v).trim())
          .filter((s) => /^\d+$/.test(s));
        params.append("id", validIds.length > 0 ? `in.(${validIds.join(",")})` : "eq.-1");
        continue;
      }
    }

    const col = toCol(model, field);
    if (cond === null) {
      params.append(col, "is.null");
    } else if (typeof cond === "string" || typeof cond === "number" || typeof cond === "boolean") {
      params.append(col, `eq.${cond}`);
    } else if (cond instanceof Date) {
      params.append(col, `eq.${cond.toISOString()}`);
    } else if (typeof cond === "object" && cond !== null) {
      const obj = cond as Record<string, unknown>;
      if ("not" in obj && obj.not === null) {
        params.append(col, "not.is.null");
      } else if ("equals" in obj && obj.equals !== undefined) {
        params.append(col, obj.equals === null ? "is.null" : `eq.${serializeValueForDb(obj.equals)}`);
      } else if ("in" in obj && Array.isArray(obj.in) && obj.in.length > 0) {
        const encoded = obj.in.map((v) => String(serializeValueForDb(v))).join(",");
        params.append(col, `in.(${encoded})`);
      }
    }
  }

  return params;
}

function createSupabasePrisma(): PrismaClient {
  const cfg = getSupabaseConfig()!;

  async function request(
    table: string,
    method: "GET" | "POST" | "PATCH" | "DELETE" | "HEAD",
    options?: {
      params?: URLSearchParams;
      body?: unknown;
      prefer?: string;
    }
  ): Promise<{ data: unknown; count: number | null }> {
    const qs = options?.params?.toString();
    const endpoint = `${cfg.url}/rest/v1/${table}${qs ? `?${qs}` : ""}`;
    const headers: Record<string, string> = {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    };
    if (options?.prefer) {
      headers["Prefer"] = options.prefer;
    }

    const res = await fetch(endpoint, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 404 || errText.includes("PGRST205") || errText.includes("does not exist")) {
        throw new SupabaseTableMissingError(table);
      }
      throw new Error(`Supabase REST error (${res.status}) on ${table}: ${errText}`);
    }

    let count: number | null = null;
    const contentRange = res.headers.get("content-range");
    if (contentRange && contentRange.includes("/")) {
      const totalStr = contentRange.split("/")[1];
      const parsed = parseInt(totalStr, 10);
      if (!Number.isNaN(parsed)) count = parsed;
    }

    if (method === "HEAD" || res.status === 204) {
      return { data: null, count };
    }

    const text = await res.text();
    return { data: text ? JSON.parse(text) : null, count };
  }

  async function fetchAllMatching(model: string, where?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const table = TABLE_MAP[model];
    if (!table) return [];
    const params = buildPostgrestFilters(model, where);
    params.set("select", "*");
    const { data } = await request(table, "GET", { params });
    const rows = Array.isArray(data) ? data.map((r) => mapRowFromDb(model, r as Record<string, unknown>)) : [];
    return rows.filter((r) => matchesWhere(r, where));
  }

  async function hydrateRelations(
    model: string,
    rows: Record<string, unknown>[],
    includeOrSelect?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    if (!includeOrSelect || rows.length === 0) return rows;
    const relMap = RELATIONS[model] ?? {};

    // Support both include: { ... } and select: { rel: { select: ... } } and _count
    const entries = Object.entries(includeOrSelect).filter(
      ([k, v]) => v && (k in relMap || k === "_count")
    );
    if (entries.length === 0) return rows;

    const hydrated = rows.map((r) => ({ ...r }));

    for (const [key, specVal] of entries) {
      if (key === "_count" && typeof specVal === "object" && specVal !== null) {
        const countSelect = (specVal as { select?: Record<string, boolean> }).select ?? {};
        for (const row of hydrated) {
          const counts: Record<string, number> = {};
          for (const [relName, enabled] of Object.entries(countSelect)) {
            if (!enabled || !(relName in relMap)) continue;
            const rel = relMap[relName];
            const relatedRows = await fetchAllMatching(rel.targetModel, {
              [rel.foreignField]: row[rel.localField],
            });
            counts[relName] = relatedRows.length;
          }
          row._count = counts;
        }
        continue;
      }

      const rel = relMap[key];
      if (!rel) continue;

      const subOpts = typeof specVal === "object" && specVal !== null ? (specVal as Record<string, unknown>) : {};
      const ids = Array.from(
        new Set(hydrated.map((r) => r[rel.localField]).filter((v) => v !== null && v !== undefined))
      );

      if (ids.length === 0) {
        for (const row of hydrated) {
          row[key] = rel.type === "many" ? [] : null;
        }
        continue;
      }

      const targetWhere = {
        ...(subOpts.where as Record<string, unknown> | undefined),
        [rel.foreignField]: { in: ids },
      };
      let targetRows = await fetchAllMatching(rel.targetModel, targetWhere);
      if (subOpts.orderBy) {
        targetRows = sortRows(targetRows, subOpts.orderBy);
      }
      if (subOpts.include) {
        targetRows = await hydrateRelations(rel.targetModel, targetRows, subOpts.include as Record<string, unknown>);
      } else if (subOpts.select) {
        targetRows = await hydrateRelations(rel.targetModel, targetRows, subOpts.select as Record<string, unknown>);
      }

      for (const row of hydrated) {
        const localVal = row[rel.localField];
        if (localVal === null || localVal === undefined) {
          row[key] = rel.type === "many" ? [] : null;
          continue;
        }
        let matching = targetRows.filter(
          (tr) => String(tr[rel.foreignField] ?? "") === String(localVal)
        );
        if (typeof subOpts.take === "number") {
          matching = matching.slice(0, subOpts.take);
        }
        if (subOpts.select) {
          matching = matching.map((m) => applySelect(m, subOpts.select as Record<string, unknown>));
        }
        row[key] = rel.type === "many" ? matching : (matching[0] ?? null);
      }
    }

    return hydrated;
  }

  function createModelProxy(model: string) {
    const table = TABLE_MAP[model];
    if (!table) {
      return createMockModel();
    }

    return {
      async findMany(args: Record<string, unknown> = {}) {
        let rows = await fetchAllMatching(model, args.where as Record<string, unknown> | undefined);
        if (args.orderBy) {
          rows = sortRows(rows, args.orderBy);
        }
        if (typeof args.skip === "number" && args.skip > 0) {
          rows = rows.slice(args.skip);
        }
        if (typeof args.take === "number" && args.take >= 0) {
          rows = rows.slice(0, args.take);
        }
        if (args.include) {
          rows = await hydrateRelations(model, rows, args.include as Record<string, unknown>);
        } else if (args.select) {
          rows = await hydrateRelations(model, rows, args.select as Record<string, unknown>);
          rows = rows.map((r) => applySelect(r, args.select as Record<string, unknown>));
        }
        return rows;
      },

      async findFirst(args: Record<string, unknown> = {}) {
        const results = await this.findMany({ ...args, take: 1 });
        return results[0] ?? null;
      },

      async findFirstOrThrow(args: Record<string, unknown> = {}) {
        const res = await this.findFirst(args);
        if (!res) throw new Error(`${model} record not found`);
        return res;
      },

      async findUnique(args: Record<string, unknown> = {}) {
        return this.findFirst(args);
      },

      async findUniqueOrThrow(args: Record<string, unknown> = {}) {
        const res = await this.findUnique(args);
        if (!res) throw new Error(`${model} record not found`);
        return res;
      },

      async count(args: Record<string, unknown> = {}) {
        const rows = await fetchAllMatching(model, args.where as Record<string, unknown> | undefined);
        return rows.length;
      },

      async aggregate(args: Record<string, unknown> = {}) {
        const rows = await fetchAllMatching(model, args.where as Record<string, unknown> | undefined);
        const _sum: Record<string, unknown> = {};
        if (args._sum && typeof args._sum === "object") {
          for (const [field, enabled] of Object.entries(args._sum as Record<string, boolean>)) {
            if (!enabled) continue;
            if (DECIMAL_FIELDS.has(field)) {
              let total = new Prisma.Decimal(0);
              for (const row of rows) {
                const v = row[field];
                if (v !== null && v !== undefined) {
                  total = total.plus(v instanceof Prisma.Decimal ? v : new Prisma.Decimal(String(v)));
                }
              }
              _sum[field] = rows.length > 0 ? total : null;
            } else {
              let total = 0;
              let hasVal = false;
              for (const row of rows) {
                const v = row[field];
                if (typeof v === "number") {
                  total += v;
                  hasVal = true;
                }
              }
              _sum[field] = hasVal ? total : null;
            }
          }
        }
        return { _sum, _count: rows.length, _avg: {}, _min: {}, _max: {} };
      },

      async groupBy(args: Record<string, unknown> = {}) {
        const rows = await fetchAllMatching(model, args.where as Record<string, unknown> | undefined);
        const by = Array.isArray(args.by) ? (args.by as string[]) : [];
        const groups = new Map<string, Record<string, unknown>[]>();

        for (const row of rows) {
          const key = JSON.stringify(by.map((f) => row[f]));
          const list = groups.get(key) ?? [];
          list.push(row);
          groups.set(key, list);
        }

        const out: Record<string, unknown>[] = [];
        for (const list of groups.values()) {
          const item: Record<string, unknown> = {};
          for (const f of by) {
            item[f] = list[0][f];
          }
          if (args._sum && typeof args._sum === "object") {
            const sumObj: Record<string, number | null> = {};
            for (const [sf, enabled] of Object.entries(args._sum as Record<string, boolean>)) {
              if (!enabled) continue;
              sumObj[sf] = list.reduce((acc, r) => acc + (typeof r[sf] === "number" ? r[sf] : Number(r[sf] ?? 0)), 0);
            }
            item._sum = sumObj;
          }
          if (args._count) {
            item._count = list.length;
          }
          out.push(item);
        }
        return out;
      },

      async create(args: Record<string, unknown> = {}) {
        const rawData = (args.data as Record<string, unknown>) ?? {};
        const dbPayload = mapDataToDb(model, rawData, true);
        const { data } = await request(table, "POST", {
          body: dbPayload,
          prefer: "return=representation",
        });
        const created = Array.isArray(data) ? data[0] : data;
        let row = mapRowFromDb(model, (created as Record<string, unknown>) ?? dbPayload);
        if (args.include) {
          row = (await hydrateRelations(model, [row], args.include as Record<string, unknown>))[0];
        } else if (args.select) {
          row = applySelect(row, args.select as Record<string, unknown>);
        }
        return row;
      },

      async createMany(args: Record<string, unknown> = {}) {
        const list = Array.isArray(args.data) ? (args.data as Record<string, unknown>[]) : [];
        if (list.length === 0) return { count: 0 };
        const payloads = list.map((item) => mapDataToDb(model, item, true));
        const prefer = args.skipDuplicates
          ? "resolution=ignore-duplicates,return=representation"
          : "return=representation";
        const { data } = await request(table, "POST", {
          body: payloads,
          prefer,
        });
        return { count: Array.isArray(data) ? data.length : payloads.length };
      },

      async update(args: Record<string, unknown> = {}) {
        const where = args.where as Record<string, unknown> | undefined;
        const matches = await fetchAllMatching(model, where);
        if (matches.length === 0) {
          throw new Error(`${model} record to update not found`);
        }
        const target = matches[0];
        const rawData = (args.data as Record<string, unknown>) ?? {};
        const dbPayload = mapDataToDb(model, rawData, false);

        if (Object.keys(dbPayload).length === 0) {
          let row = target;
          if (args.include) {
            row = (await hydrateRelations(model, [row], args.include as Record<string, unknown>))[0];
          } else if (args.select) {
            row = applySelect(row, args.select as Record<string, unknown>);
          }
          return row;
        }

        const params = new URLSearchParams();
        if (target.id !== undefined) {
          params.set("id", `eq.${target.id}`);
        } else {
          const flat = flattenWhere(where) ?? {};
          for (const [k, v] of Object.entries(flat)) {
            if (v !== undefined && v !== null) params.set(toCol(model, k), `eq.${v}`);
          }
        }

        const { data } = await request(table, "PATCH", {
          params,
          body: dbPayload,
          prefer: "return=representation",
        });
        const updated = Array.isArray(data) ? data[0] : data;
        let row = mapRowFromDb(model, (updated as Record<string, unknown>) ?? { ...target, ...rawData });
        if (args.include) {
          row = (await hydrateRelations(model, [row], args.include as Record<string, unknown>))[0];
        } else if (args.select) {
          row = applySelect(row, args.select as Record<string, unknown>);
        }
        return row;
      },

      async updateMany(args: Record<string, unknown> = {}) {
        const matches = await fetchAllMatching(model, args.where as Record<string, unknown> | undefined);
        if (matches.length === 0) return { count: 0 };
        const rawData = (args.data as Record<string, unknown>) ?? {};
        const dbPayload = mapDataToDb(model, rawData, false);

        let updatedCount = 0;
        for (const target of matches) {
          if (target.id === undefined) continue;
          const params = new URLSearchParams();
          params.set("id", `eq.${target.id}`);
          await request(table, "PATCH", {
            params,
            body: dbPayload,
            prefer: "return=minimal",
          });
          updatedCount += 1;
        }
        return { count: updatedCount };
      },

      async upsert(args: Record<string, unknown> = {}) {
        const existing = await this.findFirst({ where: args.where });
        if (existing) {
          return this.update({
            where: existing.id !== undefined ? { id: existing.id } : args.where,
            data: args.update ?? {},
            include: args.include,
            select: args.select,
          });
        }
        return this.create({
          data: args.create ?? {},
          include: args.include,
          select: args.select,
        });
      },

      async delete(args: Record<string, unknown> = {}) {
        const where = args.where as Record<string, unknown> | undefined;
        const matches = await fetchAllMatching(model, where);
        if (matches.length === 0) {
          throw new Error(`${model} record to delete not found`);
        }
        const target = matches[0];
        const params = new URLSearchParams();
        if (target.id !== undefined) {
          params.set("id", `eq.${target.id}`);
        } else {
          const flat = flattenWhere(where) ?? {};
          for (const [k, v] of Object.entries(flat)) {
            if (v !== undefined && v !== null) params.set(toCol(model, k), `eq.${v}`);
          }
        }
        await request(table, "DELETE", { params });
        return target;
      },

      async deleteMany(args: Record<string, unknown> = {}) {
        const matches = await fetchAllMatching(model, args.where as Record<string, unknown> | undefined);
        let deleted = 0;
        for (const target of matches) {
          if (target.id === undefined) continue;
          const params = new URLSearchParams();
          params.set("id", `eq.${target.id}`);
          await request(table, "DELETE", { params });
          deleted += 1;
        }
        return { count: deleted };
      },
    };
  }

  const clientMethods: Record<string, unknown> = {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async () => [],
    $queryRawUnsafe: async () => [],
    $executeRaw: async () => 0,
    $executeRawUnsafe: async () => 0,
    $on: () => {},
    $use: () => {},
  };

  const modelProxies = new Map<string, ReturnType<typeof createModelProxy>>();

  const proxy: PrismaClient = new Proxy(clientMethods, {
    get(target, prop: string) {
      if (prop === "$transaction") {
        return async (arg: unknown) => {
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          if (typeof arg === "function") {
            return (arg as (tx: PrismaClient) => Promise<unknown>)(proxy);
          }
          return null;
        };
      }
      if (prop in target) {
        return target[prop];
      }
      if (prop === "then") {
        return undefined;
      }
      if (!modelProxies.has(prop)) {
        modelProxies.set(prop, createModelProxy(prop));
      }
      return modelProxies.get(prop);
    },
  }) as unknown as PrismaClient;

  return proxy;
}

// ============================================================================
// Mock Fallback (only when neither DATABASE_URL nor Supabase keys are present)
// ============================================================================

function createMockModel() {
  const methods: Record<string, (args?: Record<string, unknown>) => unknown> = {
    findMany: async () => [],
    findFirst: async () => null,
    findFirstOrThrow: async () => null,
    findUnique: async () => null,
    findUniqueOrThrow: async () => null,
    count: async () => 0,
    groupBy: async () => [],
    aggregate: async (args) => {
      const sumSpec = args?._sum as Record<string, boolean> | undefined;
      const _sum: Record<string, null> = {};
      if (sumSpec && typeof sumSpec === "object") {
        for (const key of Object.keys(sumSpec)) {
          _sum[key] = null;
        }
      }
      return { _sum, _count: {}, _avg: {}, _min: {}, _max: {} };
    },
    create: async (args) => ({ id: "mock-id", ...((args?.data as object) ?? {}) }),
    createMany: async (args) => ({
      count: Array.isArray(args?.data) ? args.data.length : 0,
    }),
    update: async (args) => ({
      id: (args?.where as { id?: string } | undefined)?.id ?? "mock-id",
      ...((args?.data as object) ?? {}),
    }),
    updateMany: async () => ({ count: 0 }),
    upsert: async (args) => ({
      id: "mock-id",
      ...((args?.create as object) ?? (args?.update as object) ?? {}),
    }),
    delete: async (args) => ({
      id: (args?.where as { id?: string } | undefined)?.id ?? "mock-id",
    }),
    deleteMany: async () => ({ count: 0 }),
  };

  return new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop in methods) {
          return methods[prop];
        }
        return async () => null;
      },
    }
  );
}

function createMockPrisma(): PrismaClient {
  const mockModel = createMockModel();
  const mockClient: Record<string, unknown> = {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async () => [],
    $queryRawUnsafe: async () => [],
    $executeRaw: async () => 0,
    $executeRawUnsafe: async () => 0,
    $on: () => {},
    $use: () => {},
  };

  const proxy: PrismaClient = new Proxy(mockClient, {
    get(target, prop: string) {
      if (prop === "$transaction") {
        return async (arg: unknown) => {
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          if (typeof arg === "function") {
            return (arg as (tx: PrismaClient) => Promise<unknown>)(proxy);
          }
          return null;
        };
      }
      if (prop in target) {
        return target[prop];
      }
      if (prop === "then") {
        return undefined;
      }
      return mockModel;
    },
  }) as unknown as PrismaClient;

  return proxy;
}

function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; code?: string; message?: string };
  return (
    err.name === "PrismaClientInitializationError" ||
    err.name === "PrismaClientRustPanicError" ||
    err.code === "P1001" ||
    err.code === "P1002" ||
    err.code === "P1003" ||
    err.code === "P1017" ||
    Boolean(err.message && /Environment variable not found: DATABASE_URL|Can't reach database server|ECONNREFUSED/i.test(err.message))
  );
}

function createResilientPrisma(): PrismaClient {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const supabaseCfg = getSupabaseConfig();

  if (!hasDatabaseUrl) {
    if (supabaseCfg) {
      return createSupabasePrisma();
    }
    console.warn("[AI Studio] Neither DATABASE_URL nor Supabase credentials configured — using mock Prisma client");
    return createMockPrisma();
  }

  const fallback = supabaseCfg ? createSupabasePrisma() : createMockPrisma();
  let realClient: PrismaClient;
  try {
    realClient = new PrismaClient();
  } catch (err) {
    console.warn("[AI Studio] Database initialization failed — using fallback client", err);
    return fallback;
  }

  return new Proxy(realClient, {
    get(target, prop: string | symbol) {
      const value = Reflect.get(target, prop, target);
      if (prop === "$transaction") {
        return async (arg: unknown) => {
          try {
            return await (value as (a: unknown) => Promise<unknown>).call(target, arg);
          } catch (err) {
            if (isConnectionError(err)) {
              return (fallback.$transaction as (a: unknown) => Promise<unknown>)(arg);
            }
            throw err;
          }
        };
      }
      if (typeof value === "object" && value !== null) {
        return new Proxy(value, {
          get(modelTarget, method: string | symbol) {
            const fn = Reflect.get(modelTarget, method, modelTarget);
            if (typeof fn !== "function") return fn;
            return async (...args: unknown[]) => {
              try {
                return await fn.apply(modelTarget, args);
              } catch (err) {
                if (isConnectionError(err)) {
                  const fallbackModel = Reflect.get(fallback, prop);
                  const fallbackFn = Reflect.get(fallbackModel as object, method);
                  if (typeof fallbackFn === "function") {
                    return fallbackFn(...args);
                  }
                }
                throw err;
              }
            };
          },
        });
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createResilientPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
