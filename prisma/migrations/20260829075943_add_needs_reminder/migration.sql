-- AlterTable
ALTER TABLE "ClientAgreement" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "FireInsurance" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "FoodLicense" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LabourLicense" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PartnerInsurance" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "RentAgreement" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "VehicleAgreement" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WcPolicy" ADD COLUMN     "needsReminder" BOOLEAN NOT NULL DEFAULT true;
