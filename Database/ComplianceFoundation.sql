/*
   CounselNexus compliance foundation (SQL Server, idempotent).

   This migration adds the database primitives needed for restricted matters,
   documented conflict checks, LPC-style three-way trust reconciliations and
   section 86 interest allocations. It deliberately does not alter or delete
   existing financial records. Run after Schema.sql.
*/

SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.MatterAccess', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MatterAccess
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_MatterAccess PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FirmId uniqueidentifier NOT NULL,
        MatterId uniqueidentifier NOT NULL,
        UserId uniqueidentifier NOT NULL,
        AccessLevel nvarchar(30) NOT NULL CONSTRAINT DF_MatterAccess_AccessLevel DEFAULT N'View',
        GrantedByUserId uniqueidentifier NOT NULL,
        GrantedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_MatterAccess_GrantedAtUtc DEFAULT SYSUTCDATETIME(),
        RevokedAtUtc datetime2(3) NULL,
        CONSTRAINT CK_MatterAccess_Level CHECK (AccessLevel IN (N'View', N'Edit', N'Admin')),
        CONSTRAINT FK_MatterAccess_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_MatterAccess_Matter FOREIGN KEY (MatterId) REFERENCES dbo.Matters(Id),
        CONSTRAINT FK_MatterAccess_User FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_MatterAccess_GrantedBy FOREIGN KEY (GrantedByUserId) REFERENCES dbo.AspNetUsers(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_MatterAccess_Active' AND object_id = OBJECT_ID(N'dbo.MatterAccess'))
    CREATE UNIQUE INDEX UX_MatterAccess_Active ON dbo.MatterAccess(FirmId, MatterId, UserId) WHERE RevokedAtUtc IS NULL;
GO

IF OBJECT_ID(N'dbo.ConflictChecks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConflictChecks
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_ConflictChecks PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FirmId uniqueidentifier NOT NULL,
        MatterId uniqueidentifier NULL,
        IntakeReference nvarchar(100) NULL,
        RequestedByUserId uniqueidentifier NOT NULL,
        SearchTermsJson nvarchar(max) NOT NULL,
        ResultJson nvarchar(max) NULL,
        Status nvarchar(20) NOT NULL CONSTRAINT DF_ConflictChecks_Status DEFAULT N'Pending',
        CheckedAtUtc datetime2(3) NULL,
        ResolvedAtUtc datetime2(3) NULL,
        ResolutionNotes nvarchar(2000) NULL,
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_ConflictChecks_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_ConflictChecks_Status CHECK (Status IN (N'Pending', N'Clear', N'Potential', N'Confirmed', N'Waived')),
        CONSTRAINT FK_ConflictChecks_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_ConflictChecks_Matter FOREIGN KEY (MatterId) REFERENCES dbo.Matters(Id),
        CONSTRAINT FK_ConflictChecks_User FOREIGN KEY (RequestedByUserId) REFERENCES dbo.AspNetUsers(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ConflictChecks_Firm_Status' AND object_id = OBJECT_ID(N'dbo.ConflictChecks'))
    CREATE INDEX IX_ConflictChecks_Firm_Status ON dbo.ConflictChecks(FirmId, Status, CreatedAtUtc DESC);
GO

IF OBJECT_ID(N'dbo.TrustReconciliations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrustReconciliations
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_TrustReconciliations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FirmId uniqueidentifier NOT NULL,
        StatementDate date NOT NULL,
        BankBalance decimal(19,4) NOT NULL,
        ClientLedgerBalance decimal(19,4) NOT NULL,
        ControlAccountBalance decimal(19,4) NOT NULL,
        BankToLedgerVariance decimal(19,4) NOT NULL,
        LedgerToControlVariance decimal(19,4) NOT NULL,
        Status nvarchar(20) NOT NULL CONSTRAINT DF_TrustReconciliations_Status DEFAULT N'Unbalanced',
        PerformedByUserId uniqueidentifier NOT NULL,
        PerformedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_TrustReconciliations_PerformedAtUtc DEFAULT SYSUTCDATETIME(),
        EvidenceDocumentId uniqueidentifier NULL,
        Notes nvarchar(2000) NULL,
        CONSTRAINT CK_TrustReconciliations_Status CHECK (Status IN (N'Balanced', N'Unbalanced', N'Approved')),
        CONSTRAINT FK_TrustReconciliations_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_TrustReconciliations_User FOREIGN KEY (PerformedByUserId) REFERENCES dbo.AspNetUsers(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TrustReconciliations_Firm_Date' AND object_id = OBJECT_ID(N'dbo.TrustReconciliations'))
    CREATE UNIQUE INDEX UX_TrustReconciliations_Firm_Date ON dbo.TrustReconciliations(FirmId, StatementDate);
GO

IF OBJECT_ID(N'dbo.TrustInterestAllocations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrustInterestAllocations
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_TrustInterestAllocations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FirmId uniqueidentifier NOT NULL,
        MatterId uniqueidentifier NOT NULL,
        SectionCode nvarchar(10) NOT NULL,
        PeriodStart date NOT NULL,
        PeriodEnd date NOT NULL,
        AnnualRate decimal(9,6) NOT NULL,
        Principal decimal(19,4) NOT NULL,
        InterestAmount decimal(19,4) NOT NULL,
        Reference nvarchar(100) NOT NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_TrustInterestAllocations_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_TrustInterestAllocations_Section CHECK (SectionCode IN (N'86(2)', N'86(4)', N'86(5)')),
        CONSTRAINT CK_TrustInterestAllocations_Period CHECK (PeriodEnd >= PeriodStart),
        CONSTRAINT CK_TrustInterestAllocations_Amount CHECK (Principal >= 0 AND InterestAmount >= 0),
        CONSTRAINT FK_TrustInterestAllocations_Firm FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_TrustInterestAllocations_Matter FOREIGN KEY (MatterId) REFERENCES dbo.Matters(Id),
        CONSTRAINT FK_TrustInterestAllocations_User FOREIGN KEY (CreatedByUserId) REFERENCES dbo.AspNetUsers(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.TR_TrustReconciliations_Immutable', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER dbo.TR_TrustReconciliations_Immutable ON dbo.TrustReconciliations AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51020, ''Trust reconciliations are immutable; create a corrected reconciliation.'', 1; END');
GO

IF OBJECT_ID(N'dbo.TR_TrustInterestAllocations_Immutable', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER dbo.TR_TrustInterestAllocations_Immutable ON dbo.TrustInterestAllocations AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51021, ''Trust interest allocations are immutable; create a reversing/correcting entry.'', 1; END');
GO

CREATE OR ALTER PROCEDURE dbo.usp_ConflictCheck_Create
    @FirmId uniqueidentifier,
    @MatterId uniqueidentifier = NULL,
    @IntakeReference nvarchar(100) = NULL,
    @RequestedByUserId uniqueidentifier,
    @SearchTermsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id uniqueidentifier = NEWID();
    INSERT dbo.ConflictChecks(Id, FirmId, MatterId, IntakeReference, RequestedByUserId, SearchTermsJson)
    VALUES (@Id, @FirmId, @MatterId, @IntakeReference, @RequestedByUserId, @SearchTermsJson);
    SELECT * FROM dbo.ConflictChecks WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_TrustThreeWayReconciliation_Create
    @FirmId uniqueidentifier,
    @StatementDate date,
    @BankBalance decimal(19,4),
    @ControlAccountBalance decimal(19,4),
    @PerformedByUserId uniqueidentifier,
    @EvidenceDocumentId uniqueidentifier = NULL,
    @Notes nvarchar(2000) = NULL,
    @Tolerance decimal(19,4) = 0.01
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @Tolerance < 0 THROW 51022, 'Tolerance cannot be negative.', 1;

    DECLARE @LedgerBalance decimal(19,4) =
        COALESCE((SELECT SUM(CASE WHEN t.Kind = N'Receipt' OR t.TransferDirection = N'In' THEN t.Amount ELSE -t.Amount END)
                  FROM dbo.TrustTransactions t
                  WHERE t.FirmId = @FirmId AND t.IsDeleted = 0 AND CONVERT(date, t.CreatedAtUtc) <= @StatementDate), 0);
    DECLARE @BankVariance decimal(19,4) = @BankBalance - @LedgerBalance;
    DECLARE @ControlVariance decimal(19,4) = @LedgerBalance - @ControlAccountBalance;
    DECLARE @Status nvarchar(20) = CASE WHEN ABS(@BankVariance) <= @Tolerance AND ABS(@ControlVariance) <= @Tolerance THEN N'Balanced' ELSE N'Unbalanced' END;
    DECLARE @Id uniqueidentifier = NEWID();

    INSERT dbo.TrustReconciliations
        (Id, FirmId, StatementDate, BankBalance, ClientLedgerBalance, ControlAccountBalance,
         BankToLedgerVariance, LedgerToControlVariance, Status, PerformedByUserId, EvidenceDocumentId, Notes)
    VALUES
        (@Id, @FirmId, @StatementDate, @BankBalance, @LedgerBalance, @ControlAccountBalance,
         @BankVariance, @ControlVariance, @Status, @PerformedByUserId, @EvidenceDocumentId, @Notes);

    SELECT * FROM dbo.TrustReconciliations WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_TrustReconciliation_List
    @FirmId uniqueidentifier,
    @Take int = 24
AS
BEGIN
    SET NOCOUNT ON;
    SET @Take = CASE WHEN @Take BETWEEN 1 AND 120 THEN @Take ELSE 24 END;
    SELECT TOP (@Take) *
    FROM dbo.TrustReconciliations
    WHERE FirmId = @FirmId
    ORDER BY StatementDate DESC, PerformedAtUtc DESC;
END;
GO
