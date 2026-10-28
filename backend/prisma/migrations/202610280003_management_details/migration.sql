ALTER TABLE `Medicine`
  ADD COLUMN `barcode` VARCHAR(64) NULL,
  ADD COLUMN `registrationNumber` VARCHAR(80) NULL,
  ADD COLUMN `storageLocation` VARCHAR(80) NULL;
CREATE UNIQUE INDEX `Medicine_pharmacyId_barcode_key` ON `Medicine` (`pharmacyId`, `barcode`);
ALTER TABLE `Supplier`
  ADD COLUMN `taxCode` VARCHAR(40) NULL,
  ADD COLUMN `contactName` VARCHAR(120) NULL,
  ADD COLUMN `note` TEXT NULL;
