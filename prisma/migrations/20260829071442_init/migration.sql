-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleAccess" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserModuleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubModule" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAgreement" (
    "id" SERIAL NOT NULL,
    "siteName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "contractType" TEXT NOT NULL DEFAULT '',
    "siteStatus" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLicense" (
    "id" SERIAL NOT NULL,
    "siteName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "contractType" TEXT NOT NULL DEFAULT '',
    "siteStatus" TEXT NOT NULL DEFAULT '',
    "hasLicense" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WcPolicy" (
    "id" SERIAL NOT NULL,
    "siteName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "contractType" TEXT NOT NULL DEFAULT '',
    "siteStatus" TEXT NOT NULL DEFAULT '',
    "hasPolicy" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WcPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourLicense" (
    "id" SERIAL NOT NULL,
    "siteName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "contractType" TEXT NOT NULL DEFAULT '',
    "siteStatus" TEXT NOT NULL DEFAULT '',
    "licenseStatus" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "licenseNo" TEXT NOT NULL DEFAULT '',
    "count" INTEGER,
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabourLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleAgreement" (
    "id" SERIAL NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "site" TEXT NOT NULL DEFAULT '',
    "agreementStart" TIMESTAMP(3),
    "agreementEnd" TIMESTAMP(3),
    "insuranceStart" TIMESTAMP(3),
    "insuranceEnd" TIMESTAMP(3),
    "pucStart" TIMESTAMP(3),
    "pucEnd" TIMESTAMP(3),
    "fitnessEnd" TIMESTAMP(3),
    "registrationDate" TIMESTAMP(3),
    "usedFor" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL DEFAULT '',
    "active" TEXT NOT NULL DEFAULT 'Active',
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FireInsurance" (
    "id" SERIAL NOT NULL,
    "premises" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "policyAmount" DOUBLE PRECISION,
    "insuredAmount" DOUBLE PRECISION,
    "commencementDate" TIMESTAMP(3),
    "validTill" TIMESTAMP(3),
    "insuredFor" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FireInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInsurance" (
    "id" SERIAL NOT NULL,
    "proposerName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "relation" TEXT NOT NULL DEFAULT '',
    "mobileNo" TEXT NOT NULL DEFAULT '',
    "dob" TIMESTAMP(3),
    "policyNo" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "issueDate" TIMESTAMP(3),
    "validDate" TIMESTAMP(3),
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentAgreement" (
    "id" SERIAL NOT NULL,
    "premises" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "agreementDate" TIMESTAMP(3),
    "validTill" TIMESTAMP(3),
    "noOfYears" INTEGER,
    "ownerName" TEXT NOT NULL DEFAULT '',
    "monthlyRent" DOUBLE PRECISION,
    "deposit" DOUBLE PRECISION,
    "additionalRemarks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleAccess_userId_moduleId_key" ON "UserModuleAccess"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "SubModule_slug_key" ON "SubModule"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SubModule_moduleId_name_key" ON "SubModule"("moduleId", "name");

-- CreateIndex
CREATE INDEX "ClientAgreement_endDate_idx" ON "ClientAgreement"("endDate");

-- CreateIndex
CREATE INDEX "FoodLicense_endDate_idx" ON "FoodLicense"("endDate");

-- CreateIndex
CREATE INDEX "WcPolicy_endDate_idx" ON "WcPolicy"("endDate");

-- CreateIndex
CREATE INDEX "LabourLicense_endDate_idx" ON "LabourLicense"("endDate");

-- CreateIndex
CREATE INDEX "FireInsurance_validTill_idx" ON "FireInsurance"("validTill");

-- CreateIndex
CREATE INDEX "PartnerInsurance_validDate_idx" ON "PartnerInsurance"("validDate");

-- CreateIndex
CREATE INDEX "RentAgreement_validTill_idx" ON "RentAgreement"("validTill");

-- AddForeignKey
ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubModule" ADD CONSTRAINT "SubModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
