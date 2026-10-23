/* CounselNexus legal accounting foundation. Stored procedures only; no EF access. */
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.LedgerAccounts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LedgerAccounts
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_LedgerAccounts PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        Code nvarchar(30) NOT NULL,
        Name nvarchar(200) NOT NULL,
        AccountType nvarchar(20) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_LedgerAccounts_IsActive DEFAULT 1,
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_LedgerAccounts_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2(3) NULL,
        UpdatedBy nvarchar(200) NULL,
        CONSTRAINT UQ_LedgerAccounts_Firm_Code UNIQUE (FirmId, Code),
        CONSTRAINT CK_LedgerAccounts_Type CHECK (AccountType IN (N'Asset', N'Liability', N'Equity', N'Income', N'Expense')),
        CONSTRAINT FK_LedgerAccounts_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id)
    );
    CREATE INDEX IX_LedgerAccounts_Firm_Type ON dbo.LedgerAccounts(FirmId, AccountType, IsActive);
END;
GO

IF OBJECT_ID(N'dbo.JournalEntries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.JournalEntries
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_JournalEntries PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        EntryNumber nvarchar(50) NOT NULL,
        EntryDate date NOT NULL,
        Description nvarchar(1000) NOT NULL,
        SourceType nvarchar(50) NULL,
        SourceId uniqueidentifier NULL,
        Status nvarchar(20) NOT NULL CONSTRAINT DF_JournalEntries_Status DEFAULT N'Posted',
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_JournalEntries_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedByUserId uniqueidentifier NOT NULL,
        CreatedBy nvarchar(200) NULL,
        CONSTRAINT UQ_JournalEntries_Firm_Number UNIQUE (FirmId, EntryNumber),
        CONSTRAINT CK_JournalEntries_Status CHECK (Status IN (N'Posted', N'Reversed')),
        CONSTRAINT FK_JournalEntries_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_JournalEntries_User FOREIGN KEY (CreatedByUserId) REFERENCES dbo.AspNetUsers(Id)
    );
    CREATE INDEX IX_JournalEntries_Firm_Date ON dbo.JournalEntries(FirmId, EntryDate DESC);
END;
GO

IF OBJECT_ID(N'dbo.JournalLines', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.JournalLines
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_JournalLines PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        JournalEntryId uniqueidentifier NOT NULL,
        LedgerAccountId uniqueidentifier NOT NULL,
        MatterId uniqueidentifier NULL,
        Description nvarchar(500) NULL,
        Debit decimal(19,4) NOT NULL CONSTRAINT DF_JournalLines_Debit DEFAULT 0,
        Credit decimal(19,4) NOT NULL CONSTRAINT DF_JournalLines_Credit DEFAULT 0,
        CONSTRAINT CK_JournalLines_OneSide CHECK ((Debit > 0 AND Credit = 0) OR (Debit = 0 AND Credit > 0)),
        CONSTRAINT FK_JournalLines_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_JournalLines_Entry FOREIGN KEY (JournalEntryId) REFERENCES dbo.JournalEntries(Id),
        CONSTRAINT FK_JournalLines_Account FOREIGN KEY (LedgerAccountId) REFERENCES dbo.LedgerAccounts(Id),
        CONSTRAINT FK_JournalLines_Matter FOREIGN KEY (MatterId) REFERENCES dbo.Matters(Id)
    );
    CREATE INDEX IX_JournalLines_Firm_Account ON dbo.JournalLines(FirmId, LedgerAccountId, JournalEntryId);
    CREATE INDEX IX_JournalLines_Firm_Matter ON dbo.JournalLines(FirmId, MatterId, JournalEntryId);
END;
GO

IF OBJECT_ID(N'dbo.TR_JournalEntries_Immutable', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER dbo.TR_JournalEntries_Immutable ON dbo.JournalEntries AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51040, ''Posted journal entries are immutable; post a reversal instead.'', 1; END');
GO

IF OBJECT_ID(N'dbo.TR_JournalLines_Immutable', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER dbo.TR_JournalLines_Immutable ON dbo.JournalLines AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51047, ''Posted journal lines are immutable; post a reversal instead.'', 1; END');
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalAccounting_Accounts_EnsureDefaults
    @FirmId uniqueidentifier, @UserId uniqueidentifier, @Actor nvarchar(200) = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION;
    DECLARE @Defaults TABLE (Code nvarchar(30), Name nvarchar(200), AccountType nvarchar(20));
    INSERT @Defaults VALUES
        (N'1000', N'Bank account', N'Asset'),
        (N'1100', N'Client receivables', N'Asset'),
        (N'2000', N'Accounts payable', N'Liability'),
        (N'2100', N'VAT payable', N'Liability'),
        (N'3000', N'Owner equity', N'Equity'),
        (N'4000', N'Legal fees income', N'Income'),
        (N'4100', N'Disbursement recovery income', N'Income'),
        (N'5000', N'Operating expenses', N'Expense'),
        (N'5100', N'Professional disbursements', N'Expense');
    INSERT dbo.LedgerAccounts (Id, FirmId, Code, Name, AccountType, CreatedAtUtc, CreatedBy)
    SELECT NEWID(), @FirmId, d.Code, d.Name, d.AccountType, SYSUTCDATETIME(), @Actor
    FROM @Defaults d
    WHERE NOT EXISTS (SELECT 1 FROM dbo.LedgerAccounts a WHERE a.FirmId = @FirmId AND a.Code = d.Code);
    COMMIT;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalAccounting_Accounts_List
    @FirmId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Code, Name, AccountType, IsActive, CreatedAtUtc
    FROM dbo.LedgerAccounts
    WHERE FirmId = @FirmId
    ORDER BY Code;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalAccounting_Journal_Post
    @FirmId uniqueidentifier, @UserId uniqueidentifier, @Actor nvarchar(200),
    @EntryDate date, @Description nvarchar(1000), @SourceType nvarchar(50) = NULL,
    @SourceId uniqueidentifier = NULL, @LinesJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION; BEGIN TRY
    IF NULLIF(LTRIM(RTRIM(@Description)), N'') IS NULL THROW 51041, 'Journal description is required.', 1;
    DECLARE @Lines TABLE (LedgerAccountId uniqueidentifier, MatterId uniqueidentifier NULL, LineDescription nvarchar(500) NULL, Debit decimal(19,4), Credit decimal(19,4));
    INSERT @Lines
    SELECT LedgerAccountId, MatterId, LineDescription, Debit, Credit
    FROM OPENJSON(@LinesJson) WITH
    (
        LedgerAccountId uniqueidentifier '$.ledgerAccountId',
        MatterId uniqueidentifier '$.matterId',
        LineDescription nvarchar(500) '$.description',
        Debit decimal(19,4) '$.debit',
        Credit decimal(19,4) '$.credit'
    );
    IF (SELECT COUNT(1) FROM @Lines) < 2 THROW 51042, 'A journal requires at least two lines.', 1;
    IF EXISTS (SELECT 1 FROM @Lines WHERE (Debit <= 0 AND Credit <= 0) OR (Debit > 0 AND Credit > 0)) THROW 51043, 'Each journal line must contain either a debit or a credit.', 1;
    IF (SELECT COALESCE(SUM(Debit), 0) FROM @Lines) <> (SELECT COALESCE(SUM(Credit), 0) FROM @Lines) THROW 51044, 'Debits and credits must balance.', 1;
    IF EXISTS (SELECT 1 FROM @Lines l LEFT JOIN dbo.LedgerAccounts a ON a.Id = l.LedgerAccountId AND a.FirmId = @FirmId AND a.IsActive = 1 WHERE a.Id IS NULL) THROW 51045, 'One or more ledger accounts are invalid for this firm.', 1;
    IF EXISTS (SELECT 1 FROM @Lines l WHERE l.MatterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Matters m WHERE m.Id = l.MatterId AND m.FirmId = @FirmId AND m.IsDeleted = 0)) THROW 51046, 'One or more matters are invalid for this firm.', 1;
    DECLARE @EntryId uniqueidentifier = NEWID(), @EntryNumber nvarchar(50) = N'GL-' + CONVERT(char(8), @EntryDate, 112) + N'-' + UPPER(LEFT(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), 8));
    INSERT dbo.JournalEntries (Id, FirmId, EntryNumber, EntryDate, Description, SourceType, SourceId, Status, CreatedAtUtc, CreatedByUserId, CreatedBy)
    VALUES (@EntryId, @FirmId, @EntryNumber, @EntryDate, @Description, @SourceType, @SourceId, N'Posted', SYSUTCDATETIME(), @UserId, @Actor);
    INSERT dbo.JournalLines (Id, FirmId, JournalEntryId, LedgerAccountId, MatterId, Description, Debit, Credit)
    SELECT NEWID(), @FirmId, @EntryId, LedgerAccountId, MatterId, LineDescription, Debit, Credit FROM @Lines;
    INSERT dbo.AuditEvents (Id, ActorId, ActorName, Category, Action, EntityName, EntityId, DetailsJson, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    VALUES (NEWID(), @UserId, COALESCE(@Actor, N'Unknown'), N'Legal accounting', N'Journal posted', N'JournalEntry', @EntryId,
            (SELECT @EntryNumber AS entryNumber, @Description AS description FOR JSON PATH, WITHOUT_ARRAY_WRAPPER), @FirmId, SYSUTCDATETIME(), @Actor, 0);
    COMMIT;
    SELECT @EntryId AS Id, @EntryNumber AS EntryNumber;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalAccounting_Journal_Reverse
    @FirmId uniqueidentifier, @UserId uniqueidentifier, @Actor nvarchar(200), @JournalEntryId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION; BEGIN TRY
    DECLARE @OriginalNumber nvarchar(50), @OriginalDescription nvarchar(1000), @OriginalDate date;
    SELECT @OriginalNumber=EntryNumber,@OriginalDescription=Description,@OriginalDate=EntryDate
    FROM dbo.JournalEntries WITH (UPDLOCK, HOLDLOCK)
    WHERE Id=@JournalEntryId AND FirmId=@FirmId AND Status=N'Posted';
    IF @OriginalNumber IS NULL THROW 51048, 'The journal was not found or is already reversed.', 1;
    IF EXISTS (SELECT 1 FROM dbo.JournalEntries WHERE FirmId=@FirmId AND SourceType=N'Reversal' AND SourceId=@JournalEntryId AND Status=N'Posted') THROW 51049, 'This journal already has a posted reversal.', 1;
    DECLARE @NewId uniqueidentifier=NEWID(), @NewNumber nvarchar(50)=N'GL-REV-' + CONVERT(char(8), @OriginalDate, 112) + N'-' + UPPER(LEFT(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), 8));
    INSERT dbo.JournalEntries (Id,FirmId,EntryNumber,EntryDate,Description,SourceType,SourceId,Status,CreatedAtUtc,CreatedByUserId,CreatedBy)
    VALUES (@NewId,@FirmId,@NewNumber,@OriginalDate,N'Reversal of ' + @OriginalNumber + N': ' + @OriginalDescription,N'Reversal',@JournalEntryId,N'Posted',SYSUTCDATETIME(),@UserId,@Actor);
    INSERT dbo.JournalLines (Id,FirmId,JournalEntryId,LedgerAccountId,MatterId,Description,Debit,Credit)
    SELECT NEWID(),@FirmId,@NewId,LedgerAccountId,MatterId,N'Reversal of ' + COALESCE(Description,N''),Credit,Debit
    FROM dbo.JournalLines WHERE FirmId=@FirmId AND JournalEntryId=@JournalEntryId;
    INSERT dbo.AuditEvents (Id, ActorId, ActorName, Category, Action, EntityName, EntityId, DetailsJson, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    VALUES (NEWID(),@UserId,COALESCE(@Actor,N'Unknown'),N'Legal accounting',N'Journal reversed',N'JournalEntry',@NewId,
            (SELECT @JournalEntryId AS reversedJournalId,@OriginalNumber AS reversedEntryNumber FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),@FirmId,SYSUTCDATETIME(),@Actor,0);
    COMMIT;
    SELECT @NewId AS Id, @NewNumber AS EntryNumber;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalAccounting_TrialBalance
    @FirmId uniqueidentifier, @FromDate date = NULL, @ToDate date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id AS LedgerAccountId, a.Code, a.Name, a.AccountType,
           COALESCE(SUM(l.Debit), 0) AS Debits, COALESCE(SUM(l.Credit), 0) AS Credits,
           COALESCE(SUM(l.Debit - l.Credit), 0) AS Balance
    FROM dbo.LedgerAccounts a
    LEFT JOIN dbo.JournalLines l ON l.LedgerAccountId = a.Id AND l.FirmId = @FirmId
    LEFT JOIN dbo.JournalEntries e ON e.Id = l.JournalEntryId AND e.FirmId = @FirmId AND e.Status = N'Posted'
        AND (@FromDate IS NULL OR e.EntryDate >= @FromDate) AND (@ToDate IS NULL OR e.EntryDate <= @ToDate)
    WHERE a.FirmId = @FirmId AND a.IsActive = 1
    GROUP BY a.Id, a.Code, a.Name, a.AccountType
    ORDER BY a.Code;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalAccounting_Ledger
    @FirmId uniqueidentifier, @LedgerAccountId uniqueidentifier, @FromDate date = NULL, @ToDate date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT e.Id AS JournalEntryId, e.EntryNumber, e.EntryDate, e.Description, a.Code, a.Name,
           l.Description AS LineDescription, l.Debit, l.Credit, l.MatterId
    FROM dbo.JournalLines l
    INNER JOIN dbo.JournalEntries e ON e.Id = l.JournalEntryId AND e.FirmId = @FirmId AND e.Status = N'Posted'
    INNER JOIN dbo.LedgerAccounts a ON a.Id = l.LedgerAccountId AND a.FirmId = @FirmId
    WHERE l.FirmId = @FirmId AND l.LedgerAccountId = @LedgerAccountId
      AND (@FromDate IS NULL OR e.EntryDate >= @FromDate) AND (@ToDate IS NULL OR e.EntryDate <= @ToDate)
    ORDER BY e.EntryDate DESC, e.CreatedAtUtc DESC;
END;
GO

DECLARE @PermissionDefinitions TABLE ([Key] nvarchar(120) NOT NULL, [Name] nvarchar(200) NOT NULL);
INSERT @PermissionDefinitions VALUES
    (N'legal-accounting.read', N'View legal accounting'),
    (N'legal-accounting.write', N'Maintain legal accounting'),
    (N'legal-accounting.post', N'Post general ledger journals');
DECLARE @FirmId uniqueidentifier;
DECLARE firms CURSOR LOCAL FAST_FORWARD FOR SELECT Id FROM dbo.Firms;
OPEN firms;
FETCH NEXT FROM firms INTO @FirmId;
WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT dbo.Permissions (Id, [Key], Name, Description, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    SELECT NEWID(), d.[Key], d.[Name], N'Legal accounting permission', @FirmId, SYSUTCDATETIME(), N'LegalAccounting', 0
    FROM @PermissionDefinitions d
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Permissions p WHERE p.FirmId = @FirmId AND p.[Key] = d.[Key]);
    INSERT dbo.RolePermissions (Id, RoleId, PermissionId, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    SELECT NEWID(), r.Id, p.Id, @FirmId, SYSUTCDATETIME(), N'LegalAccounting', 0
    FROM dbo.AspNetRoles r CROSS JOIN dbo.Permissions p
    WHERE r.Name IN (N'SystemAdmin', N'Partner', N'Bookkeeper', N'Accountant', N'FinanceManager')
      AND p.FirmId = @FirmId AND p.[Key] IN (SELECT [Key] FROM @PermissionDefinitions)
      AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions x WHERE x.FirmId = @FirmId AND x.RoleId = r.Id AND x.PermissionId = p.Id);
    FETCH NEXT FROM firms INTO @FirmId;
END;
CLOSE firms; DEALLOCATE firms;
GO
