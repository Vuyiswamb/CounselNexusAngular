/* Payment requisition module schema. Run once against the CounselNexus database.
   This script is additive and does not alter or delete existing financial data. */
SET XACT_ABORT ON;
GO

/* Stored procedures used by the API. Payment requisitions are deliberately
   persisted through this interface instead of EF Core. */
CREATE OR ALTER PROCEDURE dbo.usp_PaymentRequisition_Dashboard
    @FirmId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        COUNT(1) AS Total,
        COALESCE(SUM(CASE WHEN Status = N'Draft' THEN 1 ELSE 0 END), 0) AS Draft,
        COALESCE(SUM(CASE WHEN Status = N'Verification' THEN 1 ELSE 0 END), 0) AS PendingVerification,
        COALESCE(SUM(CASE WHEN Status = N'PendingApproval' THEN 1 ELSE 0 END), 0) AS PendingApproval,
        COALESCE(SUM(CASE WHEN Status = N'Approved' THEN 1 ELSE 0 END), 0) AS Approved,
        COALESCE(SUM(CASE WHEN Status = N'PaymentProcessing' THEN 1 ELSE 0 END), 0) AS AwaitingPayment,
        COALESCE(SUM(CASE WHEN Status = N'Paid' THEN 1 ELSE 0 END), 0) AS Paid,
        COALESCE(SUM(TotalAmount), 0) AS RequestedAmount,
        COALESCE(SUM(CASE WHEN Status IN (N'Approved',N'PaymentProcessing',N'Paid',N'Reconciled') THEN TotalAmount ELSE 0 END), 0) AS ApprovedAmount,
        COALESCE(SUM(CASE WHEN Status IN (N'Paid',N'Reconciled') THEN TotalAmount ELSE 0 END), 0) AS PaidAmount,
        COALESCE(SUM(CASE WHEN Status IN (N'Approved',N'PaymentProcessing') THEN TotalAmount ELSE 0 END), 0) AS OutstandingAmount
    FROM dbo.PaymentRequisitions
    WHERE FirmId = @FirmId AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PaymentRequisition_List
    @FirmId uniqueidentifier, @Search nvarchar(200) = NULL, @Status nvarchar(30) = NULL, @Page int = 1, @PageSize int = 25
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page = CASE WHEN @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize < 1 OR @PageSize > 100 THEN 25 ELSE @PageSize END;
    DECLARE @SearchValue nvarchar(200) = NULLIF(LTRIM(RTRIM(@Search)), N'');
    SELECT Id, Number, RequestDateUtc, MatterId, ClientId, Category, BeneficiaryName, TotalAmount, Currency, Status, Priority, RequestedById, DueDate, Source
    FROM dbo.PaymentRequisitions
    WHERE FirmId = @FirmId AND IsDeleted = 0
      AND (@Status IS NULL OR @Status = N'' OR Status = @Status)
      AND (@SearchValue IS NULL OR Number LIKE N'%' + @SearchValue + N'%' OR BeneficiaryName LIKE N'%' + @SearchValue + N'%' OR Category LIKE N'%' + @SearchValue + N'%' OR PaymentReference LIKE N'%' + @SearchValue + N'%')
    ORDER BY RequestDateUtc DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
    SELECT COUNT(1) FROM dbo.PaymentRequisitions
    WHERE FirmId = @FirmId AND IsDeleted = 0
      AND (@Status IS NULL OR @Status = N'' OR Status = @Status)
      AND (@SearchValue IS NULL OR Number LIKE N'%' + @SearchValue + N'%' OR BeneficiaryName LIKE N'%' + @SearchValue + N'%' OR Category LIKE N'%' + @SearchValue + N'%' OR PaymentReference LIKE N'%' + @SearchValue + N'%');
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PaymentRequisition_Get
    @FirmId uniqueidentifier, @Id uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Number, RequestDateUtc, Department, MatterId, ClientId, DueDate, Priority, Motivation, Category, BeneficiaryName, BeneficiaryAccountReference, Subtotal, VatAmount, TotalAmount, Currency, Source, CostCentre, PaymentReference, Status, RequestedById
    FROM dbo.PaymentRequisitions WHERE FirmId = @FirmId AND Id = @Id AND IsDeleted = 0;
    SELECT Id, Description, Category, Amount, VatAmount, TotalAmount FROM dbo.PaymentRequisitionItems WHERE FirmId = @FirmId AND PaymentRequisitionId = @Id AND IsDeleted = 0 ORDER BY CreatedAtUtc;
    SELECT Id, Step, Decision, Comments, ActorUserId, DecidedAtUtc AS DecidedAtUtc FROM dbo.PaymentRequisitionApprovals WHERE FirmId = @FirmId AND PaymentRequisitionId = @Id AND IsDeleted = 0 ORDER BY CreatedAtUtc;
    SELECT Id, Status, Method, PaymentReference, PaymentDateUtc, BankConfirmationReference, Notes FROM dbo.PaymentRequisitionTransactions WHERE FirmId = @FirmId AND PaymentRequisitionId = @Id AND IsDeleted = 0 ORDER BY CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PaymentRequisition_Create
    @FirmId uniqueidentifier, @UserId uniqueidentifier, @Actor nvarchar(200), @Department nvarchar(200) = NULL, @MatterId uniqueidentifier = NULL, @ClientId uniqueidentifier = NULL, @DueDate date = NULL, @Priority nvarchar(20), @Motivation nvarchar(4000), @Category nvarchar(100), @BeneficiaryName nvarchar(200), @BeneficiaryAccountReference nvarchar(200) = NULL, @Currency nvarchar(3), @Source nvarchar(20), @CostCentre nvarchar(100) = NULL, @PaymentReference nvarchar(150) = NULL, @ItemsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    IF @MatterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Matters WHERE Id = @MatterId AND FirmId = @FirmId AND IsDeleted = 0) THROW 51001, 'The selected matter is not valid for this firm.', 1;
    DECLARE @Items TABLE (Description nvarchar(1000), Category nvarchar(100), Amount decimal(19,2), VatAmount decimal(19,2));
    INSERT @Items SELECT Description, Category, Amount, VatAmount FROM OPENJSON(@ItemsJson) WITH (Description nvarchar(1000) '$.description', Category nvarchar(100) '$.category', Amount decimal(19,2) '$.amount', VatAmount decimal(19,2) '$.vatAmount');
    IF NOT EXISTS (SELECT 1 FROM @Items) OR EXISTS (SELECT 1 FROM @Items WHERE Amount <= 0 OR VatAmount < 0) THROW 51002, 'Payment line items are invalid.', 1;
    DECLARE @Id uniqueidentifier = NEWID(), @Number nvarchar(40) = N'PR-' + CONVERT(char(8), SYSUTCDATETIME(), 112) + N'-' + UPPER(LEFT(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), 6));
    DECLARE @Subtotal decimal(19,2) = (SELECT SUM(Amount) FROM @Items), @Vat decimal(19,2) = (SELECT SUM(VatAmount) FROM @Items);
    INSERT dbo.PaymentRequisitions (Id,FirmId,Number,RequestDateUtc,RequestedById,Department,MatterId,ClientId,DueDate,Priority,Motivation,Category,BeneficiaryName,BeneficiaryAccountReference,Subtotal,VatAmount,TotalAmount,Currency,Source,CostCentre,PaymentReference,Status,CreatedAtUtc,CreatedBy,IsDeleted)
    VALUES (@Id,@FirmId,@Number,SYSUTCDATETIME(),@UserId,@Department,@MatterId,@ClientId,@DueDate,@Priority,@Motivation,@Category,@BeneficiaryName,@BeneficiaryAccountReference,@Subtotal,@Vat,@Subtotal+@Vat,@Currency,@Source,@CostCentre,@PaymentReference,N'Draft',SYSUTCDATETIME(),@Actor,0);
    INSERT dbo.PaymentRequisitionItems (Id,FirmId,PaymentRequisitionId,Description,Category,Amount,VatAmount,TotalAmount,CreatedAtUtc,CreatedBy,IsDeleted)
    SELECT NEWID(),@FirmId,@Id,Description,Category,Amount,VatAmount,Amount+VatAmount,SYSUTCDATETIME(),@Actor,0 FROM @Items;
    INSERT dbo.AuditEvents (Id,ActorId,ActorName,Category,Action,EntityName,EntityId,DetailsJson,FirmId,CreatedAtUtc,CreatedBy,IsDeleted) VALUES (NEWID(),@UserId,COALESCE(@Actor,N'Unknown'),N'Payment requisition',N'Created',N'PaymentRequisition',@Id,N'{"status":"Draft"}',@FirmId,SYSUTCDATETIME(),@Actor,0);
    COMMIT;
    SELECT @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PaymentRequisition_Update
    @FirmId uniqueidentifier, @UserId uniqueidentifier, @Actor nvarchar(200), @Id uniqueidentifier, @Department nvarchar(200) = NULL, @MatterId uniqueidentifier = NULL, @ClientId uniqueidentifier = NULL, @DueDate date = NULL, @Priority nvarchar(20), @Motivation nvarchar(4000), @Category nvarchar(100), @BeneficiaryName nvarchar(200), @BeneficiaryAccountReference nvarchar(200) = NULL, @Currency nvarchar(3), @Source nvarchar(20), @CostCentre nvarchar(100) = NULL, @PaymentReference nvarchar(150) = NULL, @ItemsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION;
    DECLARE @Status nvarchar(30) = (SELECT Status FROM dbo.PaymentRequisitions WITH (UPDLOCK) WHERE Id=@Id AND FirmId=@FirmId AND IsDeleted=0);
    IF @Status IS NULL BEGIN ROLLBACK; SELECT CAST(0 AS bit); RETURN; END;
    IF @Status NOT IN (N'Draft',N'Returned') THROW 51003, 'Only draft or returned requisitions can be edited.', 1;
    IF @MatterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Matters WHERE Id=@MatterId AND FirmId=@FirmId AND IsDeleted=0) THROW 51004, 'The selected matter is not valid for this firm.', 1;
    DECLARE @Items TABLE (Description nvarchar(1000), Category nvarchar(100), Amount decimal(19,2), VatAmount decimal(19,2));
    INSERT @Items SELECT Description, Category, Amount, VatAmount FROM OPENJSON(@ItemsJson) WITH (Description nvarchar(1000) '$.description', Category nvarchar(100) '$.category', Amount decimal(19,2) '$.amount', VatAmount decimal(19,2) '$.vatAmount');
    IF NOT EXISTS (SELECT 1 FROM @Items) OR EXISTS (SELECT 1 FROM @Items WHERE Amount <= 0 OR VatAmount < 0) THROW 51005, 'Payment line items are invalid.', 1;
    DECLARE @Subtotal decimal(19,2) = (SELECT SUM(Amount) FROM @Items), @Vat decimal(19,2) = (SELECT SUM(VatAmount) FROM @Items);
    UPDATE dbo.PaymentRequisitions SET Department=@Department,MatterId=@MatterId,ClientId=@ClientId,DueDate=@DueDate,Priority=@Priority,Motivation=@Motivation,Category=@Category,BeneficiaryName=@BeneficiaryName,BeneficiaryAccountReference=@BeneficiaryAccountReference,Subtotal=@Subtotal,VatAmount=@Vat,TotalAmount=@Subtotal+@Vat,Currency=@Currency,Source=@Source,CostCentre=@CostCentre,PaymentReference=@PaymentReference,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@Actor WHERE Id=@Id AND FirmId=@FirmId;
    UPDATE dbo.PaymentRequisitionItems SET IsDeleted=1,DeletedAtUtc=SYSUTCDATETIME(),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@Actor WHERE PaymentRequisitionId=@Id AND FirmId=@FirmId AND IsDeleted=0;
    INSERT dbo.PaymentRequisitionItems (Id,FirmId,PaymentRequisitionId,Description,Category,Amount,VatAmount,TotalAmount,CreatedAtUtc,CreatedBy,IsDeleted) SELECT NEWID(),@FirmId,@Id,Description,Category,Amount,VatAmount,Amount+VatAmount,SYSUTCDATETIME(),@Actor,0 FROM @Items;
    INSERT dbo.AuditEvents (Id,ActorId,ActorName,Category,Action,EntityName,EntityId,DetailsJson,FirmId,CreatedAtUtc,CreatedBy,IsDeleted) VALUES (NEWID(),@UserId,COALESCE(@Actor,N'Unknown'),N'Payment requisition',N'Updated',N'PaymentRequisition',@Id,N'{"status":"Draft"}',@FirmId,SYSUTCDATETIME(),@Actor,0);
    COMMIT; SELECT CAST(1 AS bit);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PaymentRequisition_Transition
    @FirmId uniqueidentifier, @UserId uniqueidentifier, @Actor nvarchar(200), @Id uniqueidentifier, @TargetStatus nvarchar(30), @Step nvarchar(40), @Comments nvarchar(2000) = NULL, @PaymentReference nvarchar(150) = NULL, @PaymentDateUtc datetime2 = NULL, @Method nvarchar(30) = NULL, @BankConfirmationReference nvarchar(150) = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION;
    DECLARE @Current nvarchar(30), @Requester uniqueidentifier, @Source nvarchar(20), @MatterId uniqueidentifier, @Total decimal(19,2);
    SELECT @Current=Status,@Requester=RequestedById,@Source=Source,@MatterId=MatterId,@Total=TotalAmount FROM dbo.PaymentRequisitions WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id AND FirmId=@FirmId AND IsDeleted=0;
    IF @Current IS NULL BEGIN ROLLBACK; SELECT CAST(0 AS bit); RETURN; END;
    IF NOT ((@Current=N'Draft' AND @TargetStatus=N'Submitted') OR (@Current=N'Returned' AND @TargetStatus=N'Submitted') OR (@Current=N'Submitted' AND @TargetStatus IN (N'Verification',N'PendingApproval')) OR (@Current=N'Verification' AND @TargetStatus IN (N'PendingApproval',N'Returned',N'Rejected')) OR (@Current=N'PendingApproval' AND @TargetStatus IN (N'Approved',N'Rejected')) OR (@Current=N'Approved' AND @TargetStatus=N'PaymentProcessing') OR (@Current=N'PaymentProcessing' AND @TargetStatus=N'Paid') OR (@Current=N'Paid' AND @TargetStatus=N'Reconciled')) THROW 51006, 'Invalid payment requisition status transition.', 1;
    IF @TargetStatus=N'Approved' AND @Requester=@UserId THROW 51007, 'The requester cannot approve their own requisition.', 1;
    IF @TargetStatus=N'PaymentProcessing' AND @Source=N'Trust'
    BEGIN
        IF @MatterId IS NULL THROW 51008, 'Trust requisitions must be linked to a matter.', 1;
        DECLARE @Balance decimal(19,2) = (SELECT COALESCE(SUM(CASE WHEN Kind=N'Receipt' THEN Amount WHEN Kind=N'Payment' THEN -Amount WHEN TransferDirection=N'In' THEN Amount ELSE -Amount END),0) FROM dbo.TrustTransactions WHERE FirmId=@FirmId AND MatterId=@MatterId AND IsDeleted=0);
        IF @Balance < @Total THROW 51009, 'The attributable trust balance is insufficient for this payment.', 1;
    END;
    UPDATE dbo.PaymentRequisitions SET Status=@TargetStatus,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@Actor WHERE Id=@Id AND FirmId=@FirmId;
    INSERT dbo.PaymentRequisitionApprovals (Id,FirmId,PaymentRequisitionId,ActorUserId,Step,Decision,Comments,DecidedAtUtc,CreatedAtUtc,CreatedBy,IsDeleted) VALUES (NEWID(),@FirmId,@Id,@UserId,@Step,@TargetStatus,@Comments,SYSUTCDATETIME(),SYSUTCDATETIME(),@Actor,0);
    IF @TargetStatus IN (N'PaymentProcessing',N'Paid')
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.PaymentRequisitionTransactions WHERE PaymentRequisitionId=@Id AND FirmId=@FirmId AND IsDeleted=0)
            UPDATE dbo.PaymentRequisitionTransactions SET Status=CASE WHEN @TargetStatus=N'Paid' THEN N'Paid' ELSE N'Prepared' END,PaymentReference=COALESCE(@PaymentReference,PaymentReference),PaymentDateUtc=COALESCE(@PaymentDateUtc,PaymentDateUtc),Method=COALESCE(@Method,Method),BankConfirmationReference=COALESCE(@BankConfirmationReference,BankConfirmationReference),Notes=COALESCE(@Comments,Notes),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@Actor WHERE PaymentRequisitionId=@Id AND FirmId=@FirmId AND IsDeleted=0;
        ELSE
            INSERT dbo.PaymentRequisitionTransactions (Id,FirmId,PaymentRequisitionId,Status,Method,PaymentReference,PaymentDateUtc,BankConfirmationReference,Notes,CreatedAtUtc,CreatedBy,IsDeleted) VALUES (NEWID(),@FirmId,@Id,CASE WHEN @TargetStatus=N'Paid' THEN N'Paid' ELSE N'Prepared' END,COALESCE(@Method,N'EFT'),@PaymentReference,@PaymentDateUtc,@BankConfirmationReference,@Comments,SYSUTCDATETIME(),@Actor,0);
    END;
    INSERT dbo.AuditEvents (Id,ActorId,ActorName,Category,Action,EntityName,EntityId,DetailsJson,FirmId,CreatedAtUtc,CreatedBy,IsDeleted) VALUES (NEWID(),@UserId,COALESCE(@Actor,N'Unknown'),N'Payment requisition',@Step,N'PaymentRequisition',@Id,(SELECT @Current AS previousStatus,@TargetStatus AS newStatus,@Comments AS comments FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),@FirmId,SYSUTCDATETIME(),@Actor,0);
    COMMIT; SELECT CAST(1 AS bit);
END;
GO

IF OBJECT_ID(N'dbo.PaymentRequisitions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentRequisitions
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_PaymentRequisitions PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        Number nvarchar(40) NOT NULL,
        RequestDateUtc datetime2 NOT NULL,
        RequestedById uniqueidentifier NOT NULL,
        Department nvarchar(200) NULL,
        MatterId uniqueidentifier NULL,
        ClientId uniqueidentifier NULL,
        DueDate date NULL,
        Priority nvarchar(20) NOT NULL CONSTRAINT DF_PaymentRequisitions_Priority DEFAULT N'Normal',
        Motivation nvarchar(4000) NOT NULL,
        Category nvarchar(100) NOT NULL,
        BeneficiaryName nvarchar(200) NOT NULL,
        BeneficiaryAccountReference nvarchar(200) NULL,
        Subtotal decimal(19,2) NOT NULL,
        VatAmount decimal(19,2) NOT NULL,
        TotalAmount decimal(19,2) NOT NULL,
        Currency nvarchar(3) NOT NULL CONSTRAINT DF_PaymentRequisitions_Currency DEFAULT N'ZAR',
        Source nvarchar(20) NOT NULL CONSTRAINT DF_PaymentRequisitions_Source DEFAULT N'Business',
        CostCentre nvarchar(100) NULL,
        PaymentReference nvarchar(150) NULL,
        Status nvarchar(30) NOT NULL CONSTRAINT DF_PaymentRequisitions_Status DEFAULT N'Draft',
        RejectionReason nvarchar(2000) NULL,
        ReturnReason nvarchar(2000) NULL,
        CreatedAtUtc datetime2 NOT NULL,
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2 NULL,
        UpdatedBy nvarchar(200) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_PaymentRequisitions_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2 NULL,
        RowVersion rowversion NOT NULL,
        CONSTRAINT UQ_PaymentRequisitions_Firm_Number UNIQUE (FirmId, Number),
        CONSTRAINT FK_PaymentRequisitions_Firms FOREIGN KEY (FirmId) REFERENCES dbo.Firms(Id),
        CONSTRAINT FK_PaymentRequisitions_Matters FOREIGN KEY (MatterId) REFERENCES dbo.Matters(Id),
        CONSTRAINT FK_PaymentRequisitions_Contacts FOREIGN KEY (ClientId) REFERENCES dbo.Contacts(Id),
        CONSTRAINT CK_PaymentRequisitions_Amounts CHECK (Subtotal >= 0 AND VatAmount >= 0 AND TotalAmount = Subtotal + VatAmount)
    );
    CREATE INDEX IX_PaymentRequisitions_Firm_Status_Date ON dbo.PaymentRequisitions(FirmId, Status, RequestDateUtc);
END;
GO

IF OBJECT_ID(N'dbo.PaymentRequisitionItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentRequisitionItems
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_PaymentRequisitionItems PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        PaymentRequisitionId uniqueidentifier NOT NULL,
        Description nvarchar(1000) NOT NULL,
        Category nvarchar(100) NOT NULL,
        Amount decimal(19,2) NOT NULL,
        VatAmount decimal(19,2) NOT NULL,
        TotalAmount decimal(19,2) NOT NULL,
        CreatedAtUtc datetime2 NOT NULL,
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2 NULL,
        UpdatedBy nvarchar(200) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_PaymentRequisitionItems_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2 NULL,
        CONSTRAINT FK_PaymentRequisitionItems_Requisitions FOREIGN KEY (PaymentRequisitionId) REFERENCES dbo.PaymentRequisitions(Id) ON DELETE CASCADE,
        CONSTRAINT CK_PaymentRequisitionItems_Amounts CHECK (Amount > 0 AND VatAmount >= 0 AND TotalAmount = Amount + VatAmount)
    );
    CREATE INDEX IX_PaymentRequisitionItems_Requisition ON dbo.PaymentRequisitionItems(PaymentRequisitionId);
END;
GO

IF OBJECT_ID(N'dbo.PaymentRequisitionApprovals', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentRequisitionApprovals
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_PaymentRequisitionApprovals PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        PaymentRequisitionId uniqueidentifier NOT NULL,
        ActorUserId uniqueidentifier NOT NULL,
        Step nvarchar(40) NOT NULL,
        Decision nvarchar(40) NOT NULL,
        Comments nvarchar(2000) NULL,
        DecidedAtUtc datetime2 NOT NULL,
        CreatedAtUtc datetime2 NOT NULL,
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2 NULL,
        UpdatedBy nvarchar(200) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_PaymentRequisitionApprovals_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2 NULL,
        CONSTRAINT FK_PaymentRequisitionApprovals_Requisitions FOREIGN KEY (PaymentRequisitionId) REFERENCES dbo.PaymentRequisitions(Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_PaymentRequisitionApprovals_Requisition ON dbo.PaymentRequisitionApprovals(PaymentRequisitionId, CreatedAtUtc);
END;
GO

IF OBJECT_ID(N'dbo.PaymentRequisitionTransactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentRequisitionTransactions
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_PaymentRequisitionTransactions PRIMARY KEY,
        FirmId uniqueidentifier NOT NULL,
        PaymentRequisitionId uniqueidentifier NOT NULL,
        Status nvarchar(30) NOT NULL,
        Method nvarchar(30) NOT NULL,
        PaymentReference nvarchar(150) NULL,
        PaymentDateUtc datetime2 NULL,
        BankConfirmationReference nvarchar(150) NULL,
        Notes nvarchar(2000) NULL,
        CreatedAtUtc datetime2 NOT NULL,
        CreatedBy nvarchar(200) NULL,
        UpdatedAtUtc datetime2 NULL,
        UpdatedBy nvarchar(200) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_PaymentRequisitionTransactions_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2 NULL,
        CONSTRAINT FK_PaymentRequisitionTransactions_Requisitions FOREIGN KEY (PaymentRequisitionId) REFERENCES dbo.PaymentRequisitions(Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_PaymentRequisitionTransactions_Requisition ON dbo.PaymentRequisitionTransactions(PaymentRequisitionId, CreatedAtUtc);
END;
GO

DECLARE @PermissionDefinitions TABLE ([Key] nvarchar(120) NOT NULL, [Name] nvarchar(200) NOT NULL);
INSERT @PermissionDefinitions VALUES
    (N'payments.read', N'View payment requisitions'),
    (N'payments.write', N'Create and submit payment requisitions'),
    (N'payments.verify', N'Verify payment requisitions'),
    (N'payments.approve', N'Approve payment requisitions'),
    (N'payments.process', N'Process payment requisitions'),
    (N'payments.reconcile', N'Reconcile payment requisitions');

DECLARE @FirmId uniqueidentifier;
DECLARE firms CURSOR LOCAL FAST_FORWARD FOR SELECT Id FROM dbo.Firms;
OPEN firms;
FETCH NEXT FROM firms INTO @FirmId;
WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT dbo.Permissions (Id, [Key], Name, Description, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    SELECT NEWID(), d.[Key], d.[Name], N'Payment requisition workflow permission', @FirmId, SYSUTCDATETIME(), N'PaymentRequisitions', 0
    FROM @PermissionDefinitions d
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Permissions p WHERE p.FirmId = @FirmId AND p.[Key] = d.[Key]);

    INSERT dbo.RolePermissions (Id, RoleId, PermissionId, FirmId, CreatedAtUtc, CreatedBy, IsDeleted)
    SELECT NEWID(), r.Id, p.Id, @FirmId, SYSUTCDATETIME(), N'PaymentRequisitions', 0
    FROM dbo.AspNetRoles r CROSS JOIN dbo.Permissions p
    WHERE r.Name IN (N'SystemAdmin', N'Partner') AND p.FirmId = @FirmId AND p.[Key] IN (SELECT [Key] FROM @PermissionDefinitions)
      AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions x WHERE x.FirmId = @FirmId AND x.RoleId = r.Id AND x.PermissionId = p.Id);
    FETCH NEXT FROM firms INTO @FirmId;
END;
CLOSE firms; DEALLOCATE firms;
GO
