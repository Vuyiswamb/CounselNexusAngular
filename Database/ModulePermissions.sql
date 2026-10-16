/* CounselNexus module-action permissions. Run after Schema.sql and ComplianceFoundation.sql. */
SET XACT_ABORT ON;
GO

DECLARE @PermissionDefinitions TABLE ([Key] nvarchar(120) NOT NULL, [Name] nvarchar(200) NOT NULL);
INSERT @PermissionDefinitions VALUES
    (N'contacts.create', N'Create contacts'), (N'contacts.update', N'Edit contacts'), (N'contacts.delete', N'Deactivate contacts'), (N'contacts.export', N'Export contacts'),
    (N'matters.create', N'Create matters'), (N'matters.update', N'Edit matters'), (N'matters.archive', N'Archive matters'), (N'matters.export', N'Export matters'),
    (N'notes.create', N'Create notes'), (N'notes.update', N'Edit notes'), (N'notes.archive', N'Archive notes'),
    (N'diary.create', N'Create diary events'), (N'diary.update', N'Edit diary events'), (N'diary.delete', N'Delete diary events'),
    (N'fees.create', N'Create time and disbursements'), (N'fees.update', N'Edit time and disbursements'), (N'fees.delete', N'Reverse time and disbursements'), (N'fees.approve', N'Approve time and disbursements'),
    (N'tasks.create', N'Create tasks'), (N'tasks.update', N'Edit tasks'), (N'tasks.delete', N'Delete tasks'), (N'tasks.assign', N'Assign tasks'),
    (N'documents.create', N'Upload documents'), (N'documents.update', N'Edit document details'), (N'documents.delete', N'Delete documents'), (N'documents.share', N'Share documents'), (N'documents.export', N'Export documents'),
    (N'billing.create', N'Create invoices'), (N'billing.update', N'Edit draft invoices'), (N'billing.issue', N'Issue invoices'), (N'billing.void', N'Void invoices'), (N'billing.payments', N'Record invoice payments'),
    (N'trust.receipt', N'Post trust receipts'), (N'trust.payment', N'Post trust payments'), (N'trust.transfer', N'Transfer trust funds'), (N'trust.reverse', N'Reverse trust entries'), (N'trust.reconcile', N'Reconcile trust'),
    (N'reports.export', N'Export reports'), (N'admin.users', N'Manage firm users'), (N'admin.audit', N'View audit history');

DECLARE @FirmId uniqueidentifier;
DECLARE firms CURSOR LOCAL FAST_FORWARD FOR SELECT Id FROM dbo.Firms;
OPEN firms;
FETCH NEXT FROM firms INTO @FirmId;
WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT dbo.Permissions (Id, [Key], Name, Description, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    SELECT NEWID(), d.[Key], d.[Name], N'Module-level permission', @FirmId, SYSUTCDATETIME(), N'ModulePermissions', 0
    FROM @PermissionDefinitions d
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Permissions p WHERE p.FirmId = @FirmId AND p.[Key] = d.[Key]);

    /* SystemAdmin and Partner retain complete access. Other roles receive only
       the action permissions appropriate to their existing module access. */
    INSERT dbo.RolePermissions (Id, RoleId, PermissionId, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    SELECT NEWID(), r.Id, p.Id, @FirmId, SYSUTCDATETIME(), N'ModulePermissions', 0
    FROM dbo.AspNetRoles r
    INNER JOIN dbo.Permissions p ON p.FirmId = @FirmId AND p.IsDeleted = 0
    WHERE r.Name IN (N'SystemAdmin', N'Partner')
      AND p.[Key] IN (SELECT [Key] FROM @PermissionDefinitions)
      AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions x WHERE x.FirmId = @FirmId AND x.RoleId = r.Id AND x.PermissionId = p.Id);

    FETCH NEXT FROM firms INTO @FirmId;
END;
CLOSE firms;
DEALLOCATE firms;
GO
