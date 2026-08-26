-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "escalatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LicenseWorkflowStep" ADD COLUMN     "performedById" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "floors" INTEGER,
ADD COLUMN     "landArea" DOUBLE PRECISION,
ADD COLUMN     "propertyNumber" TEXT;

-- AlterTable
ALTER TABLE "PropertyTaxPayment" ADD COLUMN     "paidById" TEXT;

-- AlterTable
ALTER TABLE "TradeLicense" ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "inspectionDate" TIMESTAMP(3),
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "validUntil" TIMESTAMP(3);
