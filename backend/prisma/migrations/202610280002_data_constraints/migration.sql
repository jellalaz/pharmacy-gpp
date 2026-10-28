-- MySQL 8.4 enforces CHECK constraints. Prisma retains these in migrations.
ALTER TABLE `InventoryBalance`
  ADD CONSTRAINT `InventoryBalance_nonnegative` CHECK (`quantity` >= 0 AND `version` >= 0);
ALTER TABLE `Medicine`
  ADD CONSTRAINT `Medicine_nonnegative` CHECK (`salePrice` >= 0 AND `lowStock` >= 0);
ALTER TABLE `MedicineBatch`
  ADD CONSTRAINT `MedicineBatch_nonnegative` CHECK (`purchasePrice` >= 0);
ALTER TABLE `GoodsReceipt`
  ADD CONSTRAINT `GoodsReceipt_nonnegative` CHECK (`total` >= 0);
ALTER TABLE `GoodsReceiptItem`
  ADD CONSTRAINT `GoodsReceiptItem_valid_quantity_price` CHECK (`quantity` > 0 AND `purchasePrice` >= 0);
ALTER TABLE `SaleItem`
  ADD CONSTRAINT `SaleItem_valid_quantity_price` CHECK (`quantity` > 0 AND `unitPrice` >= 0);
ALTER TABLE `StocktakeItem`
  ADD CONSTRAINT `StocktakeItem_nonnegative` CHECK (`expectedQuantity` >= 0 AND `countedQuantity` >= 0);
ALTER TABLE `Sale`
  ADD CONSTRAINT `Sale_valid_totals` CHECK (`subtotal` >= 0 AND `discount` >= 0 AND `discount` <= `subtotal` AND `total` = `subtotal` - `discount`);
ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_nonnegative` CHECK (`amount` >= 0);
