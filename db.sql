-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'FIELD_OFFICER', 'VETERINARIAN', 'PROJECT_MANAGER', 'FINANCE_OFFICER', 'TRAINER', 'FUNDER');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('ALL', 'DISTRICT', 'SECTOR', 'CELL', 'VILLAGE');

-- CreateEnum
CREATE TYPE "BeneficiaryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'COMPLETED', 'AWAITING_PIGLET', 'PIGLET_RECEIVED', 'GROWING', 'PREGNANT', 'LITTER_BORN', 'PIGLETS_GROWING', 'REPAYMENT_DUE', 'PARTIALLY_REPAID', 'REPAID_3_PIGLETS', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PigHealthStatus" AS ENUM ('HEALTHY', 'SICK', 'UNDER_TREATMENT', 'RECOVERED', 'CRITICAL', 'DECEASED');

-- CreateEnum
CREATE TYPE "PigStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'RETURNED', 'DECEASED', 'INACTIVE', 'REGISTERED', 'PURCHASED', 'DISTRIBUTED', 'GROWING', 'PREGNANT', 'DELIVERED', 'PIGLETS_RECORDED', 'PIGLETS_GROWING', 'REPAYMENT', 'RETURNED_PIGLETS', 'REDISTRIBUTED', 'SOLD');

-- CreateEnum
CREATE TYPE "PigSex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "RevolvingStatus" AS ENUM ('ACTIVE', 'PARTIALLY_COMPLETED', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PigletStatus" AS ENUM ('ALIVE', 'RETURNED', 'TRANSFERRED', 'DECEASED', 'SOLD', 'INACTIVE', 'WITH_MOTHER', 'GROWING', 'AVAILABLE_FOR_REDISTRIBUTION', 'REDISTRIBUTED');

-- CreateEnum
CREATE TYPE "VeterinaryVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FOLLOW_UP_REQUIRED', 'TREATMENT_REQUIRED', 'CRITICAL', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MortalityReviewStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ALERT', 'APPROVAL', 'VETERINARY', 'REVOLVING', 'HEALTH_ALERT', 'MORTALITY_ALERT');

-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('INCOME', 'EXPENSE', 'DISBURSEMENT', 'RETURN', 'FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT,
    "responsibilities" TEXT,
    "photo_url" TEXT,
    "specialization" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "show_email_public" BOOLEAN NOT NULL DEFAULT false,
    "show_phone_public" BOOLEAN NOT NULL DEFAULT false,
    "show_linkedin_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "photo_date" TIMESTAMP(3),
    "photographer" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_content" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT 'home',
    "section" TEXT NOT NULL DEFAULT 'hero',
    "title" TEXT,
    "description" TEXT,
    "primary_button_text" TEXT,
    "primary_button_link" TEXT,
    "secondary_button_text" TEXT,
    "secondary_button_link" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FIELD_OFFICER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "phoneVerified" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'ALL',
    "assignedDistrictId" TEXT,
    "assignedSectorId" TEXT,
    "assignedCellId" TEXT,
    "assignedVillageId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocationAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "districtId" TEXT,
    "sectorId" TEXT,
    "cellId" TEXT,
    "villageId" TEXT,
    "accessLevel" "AccessLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLocationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "cellId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "householdSize" INTEGER,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "districtId" TEXT,
    "sectorId" TEXT,
    "cellId" TEXT,
    "villageId" TEXT,
    "status" "BeneficiaryStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateJoined" TIMESTAMP(3) NOT NULL,
    "fieldOfficerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alternativePhone" TEXT,
    "savingsGroup" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "testimony" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pig" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "breed" TEXT,
    "sex" "PigSex",
    "sexString" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "estimatedAge" INTEGER,
    "currentWeight" DOUBLE PRECISION,
    "healthStatus" "PigHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "status" "PigStatus" NOT NULL DEFAULT 'ACTIVE',
    "beneficiaryId" TEXT,
    "districtId" TEXT,
    "sectorId" TEXT,
    "cellId" TEXT,
    "villageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateReceived" TIMESTAMP(3),
    "source" TEXT,
    "purchasePrice" DECIMAL(10,2),
    "currentLocation" TEXT,
    "healthStatusStr" TEXT,
    "pregnancyStatus" TEXT,
    "expectedDelivery" TIMESTAMP(3),
    "dateOfDelivery" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PigDistribution" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "distributedById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "initialWeight" DOUBLE PRECISION,
    "initialCondition" TEXT,
    "districtId" TEXT,
    "sectorId" TEXT,
    "cellId" TEXT,
    "villageId" TEXT,
    "programCycle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PigDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PigReturn" (
    "id" TEXT NOT NULL,
    "pigId" TEXT,
    "beneficiaryId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "condition" TEXT,
    "veterinaryVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedByVetId" TEXT,
    "districtId" TEXT,
    "sectorId" TEXT,
    "cellId" TEXT,
    "villageId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PigReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevolvingCycle" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedReturn" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "RevolvingStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevolvingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PigTransfer" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "fromBeneficiaryId" TEXT,
    "toBeneficiaryId" TEXT,
    "previousDistrictId" TEXT,
    "previousSectorId" TEXT,
    "previousCellId" TEXT,
    "previousVillageId" TEXT,
    "newDistrictId" TEXT,
    "newSectorId" TEXT,
    "newCellId" TEXT,
    "newVillageId" TEXT,
    "reason" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,

    CONSTRAINT "PigTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Litter" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "fatherPigId" TEXT,
    "pregnancyDate" TIMESTAMP(3),
    "expectedBirthDate" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "numberOfPigletsBorn" INTEGER NOT NULL,
    "numberSurvived" INTEGER NOT NULL,
    "numberLost" INTEGER NOT NULL,
    "recordedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Litter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Piglet" (
    "id" TEXT NOT NULL,
    "pigletId" TEXT,
    "litterId" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "healthStatus" TEXT,
    "status" "PigletStatus" NOT NULL DEFAULT 'ALIVE',
    "beneficiaryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "breed" TEXT,
    "returnedDate" TIMESTAMP(3),
    "returnedFromId" TEXT,
    "newBeneficiaryId" TEXT,
    "redistributedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Piglet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeterinaryExamination" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "beneficiaryId" TEXT,
    "veterinarianId" TEXT NOT NULL,
    "examinationDate" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "bodyCondition" TEXT,
    "temperature" DOUBLE PRECISION,
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "healthStatus" TEXT,
    "verificationStatus" "VeterinaryVerificationStatus" NOT NULL DEFAULT 'COMPLETED',
    "followUpDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeterinaryExamination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccinationDate" TIMESTAMP(3) NOT NULL,
    "batchNumber" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "TreatmentStatus" NOT NULL DEFAULT 'ONGOING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MortalityRecord" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "beneficiaryId" TEXT,
    "recordedById" TEXT NOT NULL,
    "veterinarianId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reportedCause" TEXT NOT NULL,
    "veterinaryCause" TEXT,
    "evidenceUrl" TEXT,
    "adminReviewStatus" "MortalityReviewStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyPigId" TEXT,
    "veterinaryExaminationId" TEXT,
    "legacyStatus" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "MortalityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "FinanceType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "beneficiaryId" TEXT,
    "pigId" TEXT,
    "category" TEXT,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "receiptUrl" TEXT,
    "status" "FinanceStatus" NOT NULL DEFAULT 'DRAFT',
    "pigletId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repayment" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sourcePigId" TEXT NOT NULL,
    "targetPiglets" INTEGER NOT NULL DEFAULT 3,
    "returnedPiglets" INTEGER NOT NULL DEFAULT 0,
    "remainingPiglets" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redistribution" (
    "id" TEXT NOT NULL,
    "pigletId" TEXT NOT NULL,
    "fromBeneficiaryId" TEXT NOT NULL,
    "toBeneficiaryId" TEXT NOT NULL,
    "redistributionDate" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeterinaryRecord" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activityType" TEXT NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "medication" TEXT,
    "vaccination" TEXT,
    "weight" DOUBLE PRECISION,
    "bodyCondition" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeterinaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeterinaryVisit" (
    "id" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "vaccination" TEXT,
    "deworming" TEXT,
    "disease" TEXT,
    "treatment" TEXT,
    "medication" TEXT,
    "dosage" TEXT,
    "followUpDate" TIMESTAMP(3),
    "recommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeterinaryVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldVisit" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "pigId" TEXT,
    "fieldOfficerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "observations" TEXT NOT NULL,
    "pigCondition" TEXT,
    "beneficiaryCondition" TEXT,
    "actionsTaken" TEXT,
    "recommendations" TEXT,
    "nextVisitDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedUserId" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "beneficiaryId" TEXT,
    "pigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTP" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "beneficiaryId" TEXT,
    "pigId" TEXT,
    "pigletId" TEXT,
    "fieldVisitId" TEXT,
    "veterinaryRecordId" TEXT,
    "financeTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDone" TEXT NOT NULL,
    "familiesVisited" INTEGER NOT NULL DEFAULT 0,
    "pigsDistributed" INTEGER NOT NULL DEFAULT 0,
    "pigsReturned" INTEGER NOT NULL DEFAULT 0,
    "problemsFound" TEXT,
    "otherActivities" TEXT,
    "comment" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminReply" TEXT,
    "repliedById" TEXT,
    "replyDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_members_display_order_idx" ON "team_members"("display_order");

-- CreateIndex
CREATE INDEX "team_members_is_published_idx" ON "team_members"("is_published");

-- CreateIndex
CREATE INDEX "team_members_is_featured_idx" ON "team_members"("is_featured");

-- CreateIndex
CREATE INDEX "gallery_items_category_idx" ON "gallery_items"("category");

-- CreateIndex
CREATE INDEX "gallery_items_is_published_idx" ON "gallery_items"("is_published");

-- CreateIndex
CREATE INDEX "gallery_items_display_order_idx" ON "gallery_items"("display_order");

-- CreateIndex
CREATE INDEX "gallery_items_photo_date_idx" ON "gallery_items"("photo_date");

-- CreateIndex
CREATE UNIQUE INDEX "website_content_page_section_key" ON "website_content"("page", "section");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE UNIQUE INDEX "District_code_key" ON "District"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_districtId_key" ON "Sector"("name", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "Cell_name_sectorId_key" ON "Cell"("name", "sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Village_name_cellId_key" ON "Village"("name", "cellId");

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_beneficiaryId_key" ON "Beneficiary"("beneficiaryId");

-- CreateIndex
CREATE INDEX "Beneficiary_nationalId_idx" ON "Beneficiary"("nationalId");

-- CreateIndex
CREATE INDEX "Beneficiary_phone_idx" ON "Beneficiary"("phone");

-- CreateIndex
CREATE INDEX "Beneficiary_districtId_idx" ON "Beneficiary"("districtId");

-- CreateIndex
CREATE INDEX "Beneficiary_sectorId_idx" ON "Beneficiary"("sectorId");

-- CreateIndex
CREATE INDEX "Beneficiary_cellId_idx" ON "Beneficiary"("cellId");

-- CreateIndex
CREATE INDEX "Beneficiary_villageId_idx" ON "Beneficiary"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "Pig_pigId_key" ON "Pig"("pigId");

-- CreateIndex
CREATE INDEX "Pig_pigId_idx" ON "Pig"("pigId");

-- CreateIndex
CREATE INDEX "Pig_beneficiaryId_idx" ON "Pig"("beneficiaryId");

-- CreateIndex
CREATE INDEX "Pig_districtId_idx" ON "Pig"("districtId");

-- CreateIndex
CREATE INDEX "Pig_sectorId_idx" ON "Pig"("sectorId");

-- CreateIndex
CREATE INDEX "Pig_cellId_idx" ON "Pig"("cellId");

-- CreateIndex
CREATE INDEX "Pig_villageId_idx" ON "Pig"("villageId");

-- CreateIndex
CREATE INDEX "Pig_healthStatus_idx" ON "Pig"("healthStatus");

-- CreateIndex
CREATE INDEX "Pig_status_idx" ON "Pig"("status");

-- CreateIndex
CREATE INDEX "PigDistribution_beneficiaryId_idx" ON "PigDistribution"("beneficiaryId");

-- CreateIndex
CREATE INDEX "PigDistribution_pigId_idx" ON "PigDistribution"("pigId");

-- CreateIndex
CREATE INDEX "PigDistribution_date_idx" ON "PigDistribution"("date");

-- CreateIndex
CREATE INDEX "PigReturn_beneficiaryId_idx" ON "PigReturn"("beneficiaryId");

-- CreateIndex
CREATE INDEX "PigReturn_pigId_idx" ON "PigReturn"("pigId");

-- CreateIndex
CREATE INDEX "PigReturn_returnDate_idx" ON "PigReturn"("returnDate");

-- CreateIndex
CREATE INDEX "RevolvingCycle_beneficiaryId_idx" ON "RevolvingCycle"("beneficiaryId");

-- CreateIndex
CREATE INDEX "RevolvingCycle_status_idx" ON "RevolvingCycle"("status");

-- CreateIndex
CREATE INDEX "RevolvingCycle_dueDate_idx" ON "RevolvingCycle"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Piglet_pigletId_key" ON "Piglet"("pigletId");

-- CreateIndex
CREATE INDEX "VeterinaryExamination_pigId_idx" ON "VeterinaryExamination"("pigId");

-- CreateIndex
CREATE INDEX "VeterinaryExamination_veterinarianId_idx" ON "VeterinaryExamination"("veterinarianId");

-- CreateIndex
CREATE INDEX "VeterinaryExamination_examinationDate_idx" ON "VeterinaryExamination"("examinationDate");

-- CreateIndex
CREATE INDEX "VeterinaryExamination_verificationStatus_idx" ON "VeterinaryExamination"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MortalityRecord_legacyPigId_key" ON "MortalityRecord"("legacyPigId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTransaction_transactionId_key" ON "FinanceTransaction"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "UserLocationAccess" ADD CONSTRAINT "UserLocationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_fieldOfficerId_fkey" FOREIGN KEY ("fieldOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_distributedById_fkey" FOREIGN KEY ("distributedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigDistribution" ADD CONSTRAINT "PigDistribution_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigReturn" ADD CONSTRAINT "PigReturn_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevolvingCycle" ADD CONSTRAINT "RevolvingCycle_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigTransfer" ADD CONSTRAINT "PigTransfer_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigTransfer" ADD CONSTRAINT "PigTransfer_fromBeneficiaryId_fkey" FOREIGN KEY ("fromBeneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigTransfer" ADD CONSTRAINT "PigTransfer_toBeneficiaryId_fkey" FOREIGN KEY ("toBeneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigTransfer" ADD CONSTRAINT "PigTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigTransfer" ADD CONSTRAINT "PigTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Litter" ADD CONSTRAINT "Litter_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Litter" ADD CONSTRAINT "Litter_fatherPigId_fkey" FOREIGN KEY ("fatherPigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piglet" ADD CONSTRAINT "Piglet_litterId_fkey" FOREIGN KEY ("litterId") REFERENCES "Litter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piglet" ADD CONSTRAINT "Piglet_returnedFromId_fkey" FOREIGN KEY ("returnedFromId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryExamination" ADD CONSTRAINT "VeterinaryExamination_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryExamination" ADD CONSTRAINT "VeterinaryExamination_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryExamination" ADD CONSTRAINT "VeterinaryExamination_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortalityRecord" ADD CONSTRAINT "MortalityRecord_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortalityRecord" ADD CONSTRAINT "MortalityRecord_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortalityRecord" ADD CONSTRAINT "MortalityRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortalityRecord" ADD CONSTRAINT "MortalityRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortalityRecord" ADD CONSTRAINT "MortalityRecord_legacyPigId_fkey" FOREIGN KEY ("legacyPigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortalityRecord" ADD CONSTRAINT "MortalityRecord_veterinaryExaminationId_fkey" FOREIGN KEY ("veterinaryExaminationId") REFERENCES "VeterinaryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_pigletId_fkey" FOREIGN KEY ("pigletId") REFERENCES "Piglet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_sourcePigId_fkey" FOREIGN KEY ("sourcePigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redistribution" ADD CONSTRAINT "Redistribution_pigletId_fkey" FOREIGN KEY ("pigletId") REFERENCES "Piglet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redistribution" ADD CONSTRAINT "Redistribution_fromBeneficiaryId_fkey" FOREIGN KEY ("fromBeneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redistribution" ADD CONSTRAINT "Redistribution_toBeneficiaryId_fkey" FOREIGN KEY ("toBeneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryRecord" ADD CONSTRAINT "VeterinaryRecord_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryRecord" ADD CONSTRAINT "VeterinaryRecord_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryVisit" ADD CONSTRAINT "VeterinaryVisit_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryVisit" ADD CONSTRAINT "VeterinaryVisit_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_fieldOfficerId_fkey" FOREIGN KEY ("fieldOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_pigletId_fkey" FOREIGN KEY ("pigletId") REFERENCES "Piglet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fieldVisitId_fkey" FOREIGN KEY ("fieldVisitId") REFERENCES "FieldVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_veterinaryRecordId_fkey" FOREIGN KEY ("veterinaryRecordId") REFERENCES "VeterinaryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_financeTransactionId_fkey" FOREIGN KEY ("financeTransactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReport" ADD CONSTRAINT "EmployeeReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;









-- ============================================================================
-- PIG PROJECT RWANDA — DATABASE UPDATE & MIGRATION SCRIPT (update.sql)
-- ============================================================================

-- 1. Role Enum Updates (Removed FIELD_OFFICER, verified cooperative hierarchy)
-- Note: PostgreSQL ENUM modifications or text casting
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PROJECT_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COOPERATIVE_LEADER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COOPERATIVE_MEMBER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CELL_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VETERINARIAN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE_OFFICER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TRAINER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FUNDER';

-- 2. Gallery Storage Bucket / Table schema support
CREATE TABLE IF NOT EXISTS "gallery_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "photo_date" TIMESTAMP(3),
    "photographer" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- 3. Cooperative & Cell Management structures
-- Cell Managers manage akagari/cell operations, Veterinarians verify pig health clearances, 
-- Accountants verify transactions, Cooperative Leaders aggregate member reports.
CREATE INDEX IF NOT EXISTS "idx_gallery_published" ON "gallery_items"("is_published");
CREATE INDEX IF NOT EXISTS "idx_gallery_category" ON "gallery_items"("category");

-- 4. Website Content (Hero Section with updated asset)
CREATE TABLE IF NOT EXISTS "website_content" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT 'home',
    "section" TEXT NOT NULL DEFAULT 'hero',
    "title" TEXT,
    "description" TEXT,
    "primary_button_text" TEXT,
    "primary_button_link" TEXT,
    "secondary_button_text" TEXT,
    "secondary_button_link" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_content_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "website_content_page_section_key" ON "website_content"("page", "section");
-- ============================================================================
-- PIG PROJECT RWANDA — E-COMMERCE, DISCOUNTS, ANIMAL STOCK REPORTS & FEED SALES
-- Idempotent SQL Migration Script — Run in Supabase SQL Editor
-- ============================================================================

-- 1. OrderStatus Enum
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PROCESSING',
    'DISPATCHED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Store Products (2-Part Catalog: 'ANIMALS' & 'ANIMAL_FOOD' + Discounts & Stock)
CREATE TABLE IF NOT EXISTS "store_products" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" NUMERIC(12, 2) NOT NULL,
  "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0,
  "discount_price" NUMERIC(12, 2),
  "discount_label" TEXT,
  "discount_starts_at" TIMESTAMP(3),
  "discount_ends_at" TIMESTAMP(3),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "low_stock_threshold" INTEGER NOT NULL DEFAULT 3,
  "category" TEXT,
  "store_section" TEXT NOT NULL DEFAULT 'ANIMALS',
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "source_pig_tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_price" NUMERIC(12, 2);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_label" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_starts_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_ends_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "store_section" TEXT NOT NULL DEFAULT 'ANIMALS';
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "source_pig_tag" TEXT;

-- 3. Store Orders
CREATE TABLE IF NOT EXISTS "store_orders" (
  "id" TEXT PRIMARY KEY,
  "order_number" TEXT UNIQUE NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT,
  "customer_phone" TEXT,
  "shipping_address" TEXT,
  "subtotal_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "discount_total" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(12, 2) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "payment_method" TEXT,
  "payment_reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "shipping_address" TEXT;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "payment_reference" TEXT;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "subtotal_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "discount_total" NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 4. Store Order Items
CREATE TABLE IF NOT EXISTS "store_order_items" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL REFERENCES "store_orders"("id") ON DELETE CASCADE,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "quantity" INTEGER NOT NULL,
  "original_price" NUMERIC(12, 2),
  "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "price" NUMERIC(12, 2) NOT NULL
);

ALTER TABLE "store_order_items" ADD COLUMN IF NOT EXISTS "original_price" NUMERIC(12, 2);
ALTER TABLE "store_order_items" ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 5. Cooperative Animal Stock Reports (Cell Manager reports cooperative animals -> Project Manager sets stock & prices)
CREATE TABLE IF NOT EXISTS "cooperative_stock_reports" (
  "id" TEXT PRIMARY KEY,
  "reported_by_id" TEXT NOT NULL,
  "reported_by_name" TEXT NOT NULL,
  "cooperative_owner_name" TEXT NOT NULL,
  "cooperative_owner_role" TEXT NOT NULL DEFAULT 'COOPERATIVE_MEMBER',
  "cell_name" TEXT NOT NULL,
  "animal_title" TEXT NOT NULL,
  "pig_count" INTEGER NOT NULL DEFAULT 1,
  "estimated_weight_kg" NUMERIC(8, 2),
  "suggested_price" NUMERIC(12, 2),
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "source_pig_tag" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "listed_product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Cell Manager Animal Food Sales (Cell Manager sells Feed -> Accountant verifies & sees reports)
CREATE TABLE IF NOT EXISTS "cell_feed_sales" (
  "id" TEXT PRIMARY KEY,
  "sale_number" TEXT UNIQUE NOT NULL,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "product_name" TEXT NOT NULL,
  "buyer_name" TEXT NOT NULL,
  "buyer_phone" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC(12, 2) NOT NULL,
  "total_amount" NUMERIC(12, 2) NOT NULL,
  "payment_method" TEXT NOT NULL DEFAULT 'Cash',
  "sold_by_id" TEXT NOT NULL,
  "sold_by_name" TEXT NOT NULL,
  "cell_name" TEXT,
  "finance_transaction_id" TEXT,
  "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS "store_products_pig_id_idx" ON "store_products"("pig_id");
CREATE INDEX IF NOT EXISTS "store_products_section_idx" ON "store_products"("store_section");
CREATE INDEX IF NOT EXISTS "store_orders_order_number_idx" ON "store_orders"("order_number");
CREATE INDEX IF NOT EXISTS "store_orders_status_idx" ON "store_orders"("status");
CREATE INDEX IF NOT EXISTS "store_order_items_order_id_idx" ON "store_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "store_order_items_product_id_idx" ON "store_order_items"("product_id");
CREATE INDEX IF NOT EXISTS "coop_stock_reports_status_idx" ON "cooperative_stock_reports"("status");
CREATE INDEX IF NOT EXISTS "cell_feed_sales_status_idx" ON "cell_feed_sales"("verification_status");
CREATE INDEX IF NOT EXISTS "cell_feed_sales_sold_by_idx" ON "cell_feed_sales"("sold_by_id");

-- 8. Row-Level Security (RLS) Policies
ALTER TABLE "store_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooperative_stock_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cell_feed_sales" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read available store products" ON "store_products";
  CREATE POLICY "Public read available store products"
    ON "store_products" FOR SELECT
    TO anon, authenticated
    USING ("isAvailable" = true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_content') THEN
    ALTER TABLE "website_content" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read website content" ON "website_content";
    CREATE POLICY "Public read website content"
      ON "website_content" FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gallery_items') THEN
    ALTER TABLE "gallery_items" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read published gallery" ON "gallery_items";
    CREATE POLICY "Public read published gallery"
      ON "gallery_items" FOR SELECT TO anon, authenticated USING ("is_published" = true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read published team" ON "team_members";
    CREATE POLICY "Public read published team"
      ON "team_members" FOR SELECT TO anon, authenticated USING ("is_published" = true);
  END IF;
END $$;








-- ============================================================================
-- PIG PROJECT RWANDA & GEBYIAN NETWORK — ROLE CLEANUP & SETTINGS MIGRATION
-- Idempotent, Transaction-Safe SQL Migration Script — Run in Supabase SQL Editor
-- ============================================================================

-- 1. Migrate & Clean Up Removed Roles ('TRAINER', 'FUNDER', 'ACCOUNTANT', 'FIELD_OFFICER')
-- Remaining 7 active roles:
--   SUPER_ADMIN, PROJECT_MANAGER (Gebyian), CELL_MANAGER,
--   COOPERATIVE_LEADER, COOPERATIVE_MEMBER, VETERINARIAN, FINANCE_OFFICER

-- 1A. Update public."users" table (TEXT role column)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    UPDATE "users" SET "role" = 'FINANCE_OFFICER' WHERE UPPER("role") = 'ACCOUNTANT';
    UPDATE "users" SET "role" = 'CELL_MANAGER' WHERE UPPER("role") = 'FIELD_OFFICER';
    UPDATE "users" SET "status" = 'INACTIVE' WHERE UPPER("role") IN ('TRAINER', 'FUNDER');
  END IF;
END $$;

-- 1B. Archive removed role accounts on public."User" and rebuild "Role" enum cleanly
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    UPDATE "User"
      SET "isActive" = false,
          "deletedAt" = COALESCE("deletedAt", NOW())
      WHERE "role"::text IN ('TRAINER', 'FUNDER');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role'
      AND e.enumlabel IN ('TRAINER', 'FUNDER', 'ACCOUNTANT', 'FIELD_OFFICER')
  ) OR (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role')
    AND (
      SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'Role'
    ) <> 7
  ) THEN
    DROP TYPE IF EXISTS "Role_active";
    CREATE TYPE "Role_active" AS ENUM (
      'SUPER_ADMIN',
      'PROJECT_MANAGER',
      'CELL_MANAGER',
      'COOPERATIVE_LEADER',
      'COOPERATIVE_MEMBER',
      'VETERINARIAN',
      'FINANCE_OFFICER'
    );

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
      ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
      ALTER TABLE "User"
        ALTER COLUMN "role" TYPE "Role_active"
        USING (
          CASE "role"::text
            WHEN 'ACCOUNTANT' THEN 'FINANCE_OFFICER'
            WHEN 'FIELD_OFFICER' THEN 'CELL_MANAGER'
            WHEN 'TRAINER' THEN 'CELL_MANAGER'
            WHEN 'FUNDER' THEN 'CELL_MANAGER'
            ELSE "role"::text
          END
        )::"Role_active";
      ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CELL_MANAGER';
    END IF;

    DROP TYPE "Role";
    ALTER TYPE "Role_active" RENAME TO "Role";
  END IF;
END $$;

-- 2. Register Gebyian Network E-Commerce Brand Settings
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SystemSetting') THEN
    INSERT INTO "SystemSetting" ("id", "key", "value", "description", "updatedAt")
    VALUES
      ('gebyian-network-name', 'ecommerce_network_name', 'Gebyian Network', 'Official name of the connected E-Commerce storefront managed by Project Manager (Gebyian).', NOW()),
      ('gebyian-manager-title', 'ecommerce_manager_title', 'Project Manager (Gebyian)', 'Authorized E-Commerce Manager title responsible for Gebyian Network stock, pricing, discounts, and orders.', NOW())
    ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value",
          "description" = EXCLUDED."description",
          "updatedAt" = NOW();
  END IF;
END $$;





















-- ============================================================================
-- GEBYIAN NETWORK & PIG PROJECT RWANDA — COMPLETE SUPABASE SQL SCHEMA UPDATE
-- Idempotent Migration Script — Safe to execute repeatedly in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORDER STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. STORE PRODUCTS (Animals & Animal Food)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "store_products" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" NUMERIC(12, 2) NOT NULL,
  "is_negotiable" BOOLEAN NOT NULL DEFAULT false,
  "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0,
  "discount_price" NUMERIC(12, 2),
  "discount_label" TEXT,
  "discount_starts_at" TIMESTAMP(3),
  "discount_ends_at" TIMESTAMP(3),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "low_stock_threshold" INTEGER NOT NULL DEFAULT 3,
  "category" TEXT,
  "store_section" TEXT NOT NULL DEFAULT 'ANIMALS',
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "pig_id" TEXT,
  "source_pig_tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backward-compatible columns addition
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "is_negotiable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_price" NUMERIC(12, 2);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_label" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_starts_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_ends_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "store_section" TEXT NOT NULL DEFAULT 'ANIMALS';
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "pig_id" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "source_pig_tag" TEXT;

CREATE INDEX IF NOT EXISTS "store_products_pig_id_idx" ON "store_products"("pig_id");
CREATE INDEX IF NOT EXISTS "store_products_section_idx" ON "store_products"("store_section");
CREATE INDEX IF NOT EXISTS "store_products_stock_idx" ON "store_products"("stock");

-- ----------------------------------------------------------------------------
-- 3. STORE ORDERS (Public Buyer Orders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "store_orders" (
  "id" TEXT PRIMARY KEY,
  "order_number" TEXT UNIQUE NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT,
  "customer_phone" TEXT,
  "shipping_address" TEXT,
  "subtotal_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "discount_total" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(12, 2) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "payment_method" TEXT,
  "payment_reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "shipping_address" TEXT;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "payment_reference" TEXT;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "subtotal_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "discount_total" NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "store_orders_order_number_idx" ON "store_orders"("order_number");
CREATE INDEX IF NOT EXISTS "store_orders_status_idx" ON "store_orders"("status");

-- ----------------------------------------------------------------------------
-- 4. STORE ORDER ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "store_order_items" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL REFERENCES "store_orders"("id") ON DELETE CASCADE,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "quantity" INTEGER NOT NULL,
  "original_price" NUMERIC(12, 2),
  "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "price" NUMERIC(12, 2) NOT NULL
);

ALTER TABLE "store_order_items" ADD COLUMN IF NOT EXISTS "original_price" NUMERIC(12, 2);
ALTER TABLE "store_order_items" ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "store_order_items_order_id_idx" ON "store_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "store_order_items_product_id_idx" ON "store_order_items"("product_id");

-- ----------------------------------------------------------------------------
-- 5. COOPERATIVE ANIMAL STOCK REPORTS (Cell Manager Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cooperative_stock_reports" (
  "id" TEXT PRIMARY KEY,
  "reported_by_id" TEXT NOT NULL,
  "reported_by_name" TEXT NOT NULL,
  "cooperative_owner_name" TEXT NOT NULL,
  "cooperative_owner_role" TEXT NOT NULL DEFAULT 'COOPERATIVE_MEMBER',
  "cell_name" TEXT NOT NULL,
  "animal_title" TEXT NOT NULL,
  "pig_count" INTEGER NOT NULL DEFAULT 1,
  "estimated_weight_kg" NUMERIC(8, 2),
  "suggested_price" NUMERIC(12, 2),
  "pig_id" TEXT,
  "source_pig_tag" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "listed_product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "coop_stock_reports_status_idx" ON "cooperative_stock_reports"("status");
CREATE INDEX IF NOT EXISTS "coop_stock_reports_cell_idx" ON "cooperative_stock_reports"("cell_name");

-- ----------------------------------------------------------------------------
-- 6. CELL FEED SALES (Animal Food Field Sales by Cell Manager)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cell_feed_sales" (
  "id" TEXT PRIMARY KEY,
  "sale_number" TEXT UNIQUE NOT NULL,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "product_name" TEXT NOT NULL,
  "buyer_name" TEXT NOT NULL,
  "buyer_phone" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC(12, 2) NOT NULL,
  "total_amount" NUMERIC(12, 2) NOT NULL,
  "payment_method" TEXT NOT NULL DEFAULT 'Cash',
  "sold_by_id" TEXT NOT NULL,
  "sold_by_name" TEXT NOT NULL,
  "cell_name" TEXT,
  "finance_transaction_id" TEXT,
  "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "cell_feed_sales_status_idx" ON "cell_feed_sales"("verification_status");
CREATE INDEX IF NOT EXISTS "cell_feed_sales_sold_by_idx" ON "cell_feed_sales"("sold_by_id");

-- ----------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET: "product-image" (Local PC Photo Uploads)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets ("id", "name", "public")
VALUES ('product-image', 'product-image', true)
ON CONFLICT ("id") DO UPDATE
  SET "public" = true;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read product-image bucket" ON storage.objects;
  CREATE POLICY "Public read product-image bucket"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'product-image');
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service manage product-image bucket" ON storage.objects;
  CREATE POLICY "Service manage product-image bucket"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'product-image')
    WITH CHECK (bucket_id = 'product-image');
EXCEPTION WHEN undefined_table THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 8. COOPERATIVES (Max 15 Members including 1 Manager)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cooperatives" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "cell_name" TEXT NOT NULL,
  "max_members" INTEGER NOT NULL DEFAULT 15 CHECK ("max_members" = 15),
  "leader_user_id" TEXT,
  "leader_name" TEXT,
  "created_by_id" TEXT NOT NULL,
  "created_by_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "cooperatives_created_by_idx" ON "cooperatives"("created_by_id");
CREATE INDEX IF NOT EXISTS "cooperatives_leader_idx" ON "cooperatives"("leader_user_id");

-- Link users to cooperative and password change flag
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cooperative_id" TEXT REFERENCES "cooperatives"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "users_cooperative_id_idx" ON "users"("cooperative_id");

-- Link Pig to cooperative, finance batch collection, purchase price (default 80,000 RWF), and member owner
ALTER TABLE "Pig"
  ADD COLUMN IF NOT EXISTS "cooperative_id" TEXT REFERENCES "cooperatives"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "owner_member_id" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_member_name" TEXT,
  ADD COLUMN IF NOT EXISTS "pig_type" TEXT,
  ADD COLUMN IF NOT EXISTS "days_age" INTEGER,
  ADD COLUMN IF NOT EXISTS "batch_code" TEXT,
  ADD COLUMN IF NOT EXISTS "stocked_by_finance_id" TEXT,
  ADD COLUMN IF NOT EXISTS "purchasePrice" NUMERIC(10, 2) DEFAULT 80000.00;

ALTER TABLE "Pig" ALTER COLUMN "purchasePrice" SET DEFAULT 80000.00;

CREATE INDEX IF NOT EXISTS "Pig_cooperative_id_idx" ON "Pig"("cooperative_id");
CREATE INDEX IF NOT EXISTS "Pig_owner_member_id_idx" ON "Pig"("owner_member_id");
CREATE INDEX IF NOT EXISTS "Pig_batch_code_idx" ON "Pig"("batch_code");
CREATE INDEX IF NOT EXISTS "Pig_stocked_by_finance_idx" ON "Pig"("stocked_by_finance_id");

-- Cooperative Member -> Cooperative Leader Reports
CREATE TABLE IF NOT EXISTS "cooperative_member_reports" (
  "id" TEXT PRIMARY KEY,
  "cooperative_id" TEXT NOT NULL REFERENCES "cooperatives"("id") ON DELETE CASCADE,
  "cooperative_name" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "member_name" TEXT NOT NULL,
  "leader_id" TEXT,
  "leader_name" TEXT,
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "pig_tag" TEXT,
  "report_type" TEXT NOT NULL DEFAULT 'ROUTINE_UPDATE',
  "animal_count" INTEGER NOT NULL DEFAULT 1,
  "estimated_weight_kg" NUMERIC(8,2),
  "summary" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "leader_notes" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "coop_member_reports_coop_idx" ON "cooperative_member_reports"("cooperative_id");
CREATE INDEX IF NOT EXISTS "coop_member_reports_member_idx" ON "cooperative_member_reports"("member_id");
CREATE INDEX IF NOT EXISTS "coop_member_reports_status_idx" ON "cooperative_member_reports"("status");

-- Enforce max 15 members per cooperative
CREATE OR REPLACE FUNCTION enforce_cooperative_max_15_members()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF NEW.cooperative_id IS NOT NULL AND UPPER(COALESCE(NEW.status, 'ACTIVE')) <> 'DELETED' THEN
    SELECT COUNT(*)
      INTO member_count
      FROM "users"
     WHERE cooperative_id = NEW.cooperative_id
       AND UPPER(COALESCE(status, 'ACTIVE')) <> 'DELETED'
       AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF member_count >= 15 THEN
      RAISE EXCEPTION 'Cooperative capacity limit reached: maximum 15 members (including Cooperative Manager) allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_cooperative_max_15 ON "users";
CREATE TRIGGER trg_enforce_cooperative_max_15
  BEFORE INSERT OR UPDATE OF cooperative_id, status ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_cooperative_max_15_members();

-- ----------------------------------------------------------------------------
-- 9. COOPERATIVE MEMBER QUALIFICATION PAYMENTS (16K RWF + 2.8K TAX = 18.8K RWF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cooperative_member_payments" (
  "id" TEXT PRIMARY KEY,
  "member_id" TEXT NOT NULL,
  "cooperative_id" TEXT NOT NULL REFERENCES "cooperatives"("id") ON DELETE CASCADE,
  "pig_value_fee" NUMERIC(10,2) NOT NULL DEFAULT 16000.00,
  "tax_fee" NUMERIC(10,2) NOT NULL DEFAULT 2800.00,
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 18800.00,
  "momo_reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VERIFIED',
  "verified_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "coop_member_payments_member_idx" ON "cooperative_member_payments"("member_id");
CREATE INDEX IF NOT EXISTS "coop_member_payments_coop_idx" ON "cooperative_member_payments"("cooperative_id");

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) FOR PUBLIC ACCESS
-- ----------------------------------------------------------------------------
ALTER TABLE "store_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooperative_stock_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cell_feed_sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooperative_member_payments" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read available store products" ON "store_products";
  CREATE POLICY "Public read available store products"
    ON "store_products" FOR SELECT
    TO anon, authenticated
    USING ("isAvailable" = true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on store_products" ON "store_products";
  CREATE POLICY "Service role full access on store_products"
    ON "store_products" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on store_orders" ON "store_orders";
  CREATE POLICY "Service role full access on store_orders"
    ON "store_orders" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on store_order_items" ON "store_order_items";
  CREATE POLICY "Service role full access on store_order_items"
    ON "store_order_items" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on cooperative_stock_reports" ON "cooperative_stock_reports";
  CREATE POLICY "Service role full access on cooperative_stock_reports"
    ON "cooperative_stock_reports" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on cell_feed_sales" ON "cell_feed_sales";
  CREATE POLICY "Service role full access on cell_feed_sales"
    ON "cell_feed_sales" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on cooperative_member_payments" ON "cooperative_member_payments";
  CREATE POLICY "Service role full access on cooperative_member_payments"
    ON "cooperative_member_payments" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

-- Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
