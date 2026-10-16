/* CounselNexus platform control panel and subscription billing foundation. */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF COL_LENGTH(N'dbo.Firms', N'IsEnabled') IS NULL
BEGIN
    ALTER TABLE dbo.Firms ADD IsEnabled bit NOT NULL CONSTRAINT DF_Firms_IsEnabled DEFAULT (1) WITH VALUES;
END;
GO

IF OBJECT_ID(N'dbo.SubscriptionComponents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubscriptionComponents
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_SubscriptionComponents PRIMARY KEY,
        Code nvarchar(80) NOT NULL CONSTRAINT UQ_SubscriptionComponents_Code UNIQUE,
        Name nvarchar(150) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_SubscriptionComponents_IsActive DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.SubscriptionPlanComponents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubscriptionPlanComponents
    (
        PlanId uniqueidentifier NOT NULL,
        ComponentId uniqueidentifier NOT NULL,
        CONSTRAINT PK_SubscriptionPlanComponents PRIMARY KEY (PlanId, ComponentId),
        CONSTRAINT FK_SubscriptionPlanComponents_Plans FOREIGN KEY (PlanId) REFERENCES dbo.SubscriptionPlans(Id) ON DELETE CASCADE,
        CONSTRAINT FK_SubscriptionPlanComponents_Components FOREIGN KEY (ComponentId) REFERENCES dbo.SubscriptionComponents(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Code = N'STANDARD')
    INSERT dbo.SubscriptionPlans (Id, Code, Name, MonthlyPrice, Currency, IsActive)
    VALUES (NEWID(), N'STANDARD', N'Standard', 0, N'ZAR', 1);

DECLARE @Components TABLE (Code nvarchar(80), Name nvarchar(150));
INSERT @Components VALUES
 (N'DASHBOARD',N'Dashboard'),(N'CONTACTS',N'Contacts'),(N'MATTERS',N'Matters'),
 (N'DOCUMENTS',N'Documents'),(N'TASKS',N'Tasks'),(N'CALENDAR',N'Legal Calendar & Court Diary'),
 (N'FEES',N'Fees & Time'),(N'BILLING',N'Billing'),(N'TRUST',N'Trust Accounting'),(N'REPORTS',N'Reports');
INSERT dbo.SubscriptionComponents (Id,Code,Name)
SELECT NEWID(), c.Code, c.Name FROM @Components c
WHERE NOT EXISTS (SELECT 1 FROM dbo.SubscriptionComponents x WHERE x.Code=c.Code);

INSERT dbo.SubscriptionPlanComponents (PlanId, ComponentId)
SELECT p.Id, c.Id FROM dbo.SubscriptionPlans p CROSS JOIN dbo.SubscriptionComponents c
WHERE p.Code=N'STANDARD' AND NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlanComponents pc WHERE pc.PlanId=p.Id AND pc.ComponentId=c.Id);
GO

IF OBJECT_ID(N'dbo.SubscriptionPlans', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubscriptionPlans
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_SubscriptionPlans PRIMARY KEY,
        Code nvarchar(50) NOT NULL,
        Name nvarchar(120) NOT NULL,
        MonthlyPrice decimal(18,2) NOT NULL,
        Currency char(3) NOT NULL CONSTRAINT DF_SubscriptionPlans_Currency DEFAULT ('ZAR'),
        IsActive bit NOT NULL CONSTRAINT DF_SubscriptionPlans_IsActive DEFAULT (1),
        CreatedAtUtc datetime2 NOT NULL CONSTRAINT DF_SubscriptionPlans_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_SubscriptionPlans_Code ON dbo.SubscriptionPlans(Code);
END;
GO

IF OBJECT_ID(N'dbo.FirmSubscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FirmSubscriptions
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_FirmSubscriptions PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        PlanId uniqueidentifier NOT NULL,
        Status nvarchar(30) NOT NULL,
        StartsAtUtc datetime2 NOT NULL,
        EndAtUtc datetime2 NOT NULL,
        RenewsAtUtc datetime2 NULL,
        CancelledAtUtc datetime2 NULL,
        CreatedAtUtc datetime2 NOT NULL CONSTRAINT DF_FirmSubscriptions_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2 NULL,
        UpdatedBy nvarchar(200) NULL,
        CONSTRAINT FK_FirmSubscriptions_Firms FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_FirmSubscriptions_Plans FOREIGN KEY (PlanId) REFERENCES dbo.SubscriptionPlans(Id)
    );
    CREATE INDEX IX_FirmSubscriptions_FirmId ON dbo.FirmSubscriptions(FirmId, Status);
END;
GO

/* Existing installations: every subscription must have a definite end date. */
IF COL_LENGTH(N'dbo.FirmSubscriptions', N'EndAtUtc') IS NULL
    ALTER TABLE dbo.FirmSubscriptions ADD EndAtUtc datetime2 NULL;
GO

UPDATE dbo.FirmSubscriptions
SET EndAtUtc = COALESCE(EndAtUtc, RenewsAtUtc, DATEADD(month, 1, StartsAtUtc))
WHERE EndAtUtc IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.FirmSubscriptions') AND name = N'EndAtUtc' AND is_nullable = 1)
    ALTER TABLE dbo.FirmSubscriptions ALTER COLUMN EndAtUtc datetime2 NOT NULL;
GO

IF OBJECT_ID(N'dbo.SubscriptionPayments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubscriptionPayments
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_SubscriptionPayments PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        FirmSubscriptionId uniqueidentifier NOT NULL,
        Amount decimal(18,2) NOT NULL,
        Currency char(3) NOT NULL CONSTRAINT DF_SubscriptionPayments_Currency DEFAULT ('ZAR'),
        Status nvarchar(30) NOT NULL,
        PaidAtUtc datetime2 NULL,
        ExternalReference nvarchar(150) NULL,
        Notes nvarchar(1000) NULL,
        CreatedAtUtc datetime2 NOT NULL CONSTRAINT DF_SubscriptionPayments_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        Months int NOT NULL CONSTRAINT DF_SubscriptionPayments_Months DEFAULT (1),
        CreatedByUserId uniqueidentifier NULL,
        CreatedBy nvarchar(200) NULL,
        CONSTRAINT FK_SubscriptionPayments_Firms FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_SubscriptionPayments_Subscriptions FOREIGN KEY (FirmSubscriptionId) REFERENCES dbo.FirmSubscriptions(Id)
    );
    CREATE INDEX IX_SubscriptionPayments_FirmId ON dbo.SubscriptionPayments(FirmId, PaidAtUtc);
END;
GO

IF COL_LENGTH(N'dbo.SubscriptionPayments', N'Months') IS NULL
    ALTER TABLE dbo.SubscriptionPayments ADD Months int NOT NULL CONSTRAINT DF_SubscriptionPayments_Months DEFAULT (1) WITH VALUES;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Code = N'TRIAL')
    INSERT dbo.SubscriptionPlans (Id, Code, Name, MonthlyPrice, Currency, IsActive)
    VALUES (NEWID(), N'TRIAL', N'Trial', 0, 'ZAR', 1);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles WHERE NormalizedName = N'PLATFORMADMIN')
    INSERT dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (NEWID(), N'PlatformAdmin', N'PLATFORMADMIN', CONVERT(nvarchar(36), NEWID()));
GO

/* Backfill existing law firms created before subscription tracking existed. */
INSERT dbo.FirmSubscriptions (Id, FirmId, PlanId, Status, StartsAtUtc, EndAtUtc, RenewsAtUtc, CreatedBy)
SELECT NEWID(), f.Id, p.Id, N'Trial', f.CreatedAtUtc, DATEADD(day, 14, f.CreatedAtUtc), DATEADD(day, 14, f.CreatedAtUtc), N'PlatformSubscriptionBackfill'
FROM dbo.Firms f
CROSS JOIN dbo.SubscriptionPlans p
WHERE p.Code = N'TRIAL'
  AND NOT EXISTS (SELECT 1 FROM dbo.FirmSubscriptions s WHERE s.FirmId = f.Id);
GO
