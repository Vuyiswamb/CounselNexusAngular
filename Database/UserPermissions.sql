/* Per-user module permission overrides. Run after ModulePermissions.sql. */
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.UserPermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserPermissions
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_UserPermissions PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        UserId uniqueidentifier NOT NULL,
        PermissionId uniqueidentifier NOT NULL,
        IsAllowed bit NOT NULL,
        CreatedAtUtc datetime2 NOT NULL,
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2 NULL,
        UpdatedBy nvarchar(200) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_UserPermissions_IsDeleted DEFAULT (0),
        DeletedAtUtc datetime2 NULL,
        CONSTRAINT FK_UserPermissions_Firms FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_UserPermissions_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_UserPermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(Id)
    );
    CREATE UNIQUE INDEX UX_UserPermissions_Firm_User_Permission
        ON dbo.UserPermissions(FirmId, UserId, PermissionId);
END;
GO
