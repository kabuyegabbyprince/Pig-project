import { PigHealthStatus, PigStatus } from "@prisma/client";

export const MOMO_SETTING_KEY = "FINANCE_MOMO_MERCHANT_CODE";
export const DEFAULT_MOMO_CODE = "";
export const DEFAULT_PIG_PRICE_RWF = 80000;

export type SerializedFinancePigStock = {
  id: string;
  tagNumber: string;
  batchCode: string | null;
  pigType: string | null;
  daysAge: number | null;
  breed: string | null;
  sex: string | null;
  currentWeight: number | null;
  purchasePrice: string | null;
  source: string | null;
  notes: string | null;
  healthStatus: PigHealthStatus;
  status: PigStatus;
  stockedByFinanceId: string | null;
  cooperativeId: string | null;
  cooperativeName: string | null;
  ownerMemberName: string | null;
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  latestVetExamSummary: string | null;
  latestVetExamDate: string | null;
  dateReceived: string | null;
  createdAt: string;
};

export type SerializedBatchSummary = {
  batchCode: string;
  pigCount: number;
  totalInvestment: string;
  unitPriceAvg: string;
  availableCount: number;
  distributedCount: number;
  healthyCount: number;
  sickOrTreatmentCount: number;
  source: string | null;
  createdAt: string;
};

export type SerializedMemberPaymentRecord = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  cooperativeId: string;
  cooperativeName: string;
  cellManagerName: string | null;
  pigValueFee: string;
  taxFee: string;
  totalAmount: string;
  momoReference: string;
  status: string;
  verifiedByName: string | null;
  createdAt: string;
};

export type SerializedDistributionAuditRow = {
  id: string;
  pigId: string;
  pigTag: string;
  batchCode: string | null;
  pigType: string | null;
  pigValueRwf: string | null;
  cellManagerName: string | null;
  cooperativeName: string | null;
  memberName: string;
  memberPhone: string | null;
  memberRoleOrType: string;
  paymentVerified: boolean;
  paymentAmount: string | null;
  momoReference: string | null;
  distributionDate: string;
  notes: string | null;
};

export type SerializedPigCycleRow = {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryPhone: string | null;
  cooperativeName: string | null;
  pigId: string | null;
  pigTag: string | null;
  batchCode: string | null;
  pigValueRwf: string | null;
  pigStatus: string | null;
  pigHealthStatus: string | null;
  cycleNumber: number;
  startDate: string;
  dueDate: string | null;
  expectedReturn: number;
  returnedCount: number;
  status: string;
  isPastDue: boolean;
  notes: string | null;
};

export type SerializedFinanceWorkspaceData = {
  schemaMissing: boolean;
  schemaWarning: string | null;
  momoMerchantCode: string;
  totalLivestockInvestment: string;
  totalPigPurchaseExpenses: string;
  totalBatchesCount: number;
  totalPigsCount: number;
  stockedPigs: SerializedFinancePigStock[];
  batches: SerializedBatchSummary[];
  memberPayments: SerializedMemberPaymentRecord[];
  auditRows: SerializedDistributionAuditRow[];
  pigCycles: SerializedPigCycleRow[];
};
