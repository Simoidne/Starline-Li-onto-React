-- Run only after backup and explicit release approval. Never run automatically.
-- The guard aborts if legacy-role accounts exist; never delete or reassign them.
DELIMITER //
CREATE PROCEDURE starline_retire_sales()
BEGIN
 IF EXISTS (SELECT 1 FROM starline_admin_users WHERE role NOT IN ('owner','operations')) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve legacy role accounts before migrating';
 END IF;
 ALTER TABLE starline_admin_users MODIFY role ENUM('owner','operations') NOT NULL;
END//
DELIMITER ;
CALL starline_retire_sales();
DROP PROCEDURE starline_retire_sales;
-- Schema rollback (does not restore removed application functionality):
-- ALTER TABLE starline_admin_users MODIFY role ENUM('owner','operations','sales') NOT NULL;
