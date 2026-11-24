import { PigHealthStatus, PigStatus } from "@prisma/client";

export const MOMO_SETTING_KEY = "FINANCE_MOMO_MERCHANT_CODE";
export const DEFAULT_MOMO_CODE = "*182*8*1*123456# (Pig Project Rwanda)";

export type SerializedFinancePigStock = {
  id: string;
  tagNumber: string;
  pigType: string | null;
  daysAge: number | null;
  breed: string | null;
  sex: string | null;
  currentWeight: number | null;
  healthStatus: PigHealthStatus;
  status: PigStatus;
  stockedByFinanceId: string | null;
  createdAt: string;
};

export type SerializedMemberPaymentRecord = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  cooperativeId: string;
  cooperativeName: string;
  pigValueFee: string;
  taxFee: string;
  totalAmount: string;
  momoReference: string;
  status: string;
  createdAt: string;
};

export type SerializedDistributionAuditRow = {
  id: string;
  pigTag: string;
  pigType: string | null;
  cellManagerName: string;
  cooperativeName: string;
  memberName: string;
  memberPhone: string | null;
  paymentVerified: boolean;
  momoReference: string | null;
  distributionDate: string;
  notes: string | null;
};
