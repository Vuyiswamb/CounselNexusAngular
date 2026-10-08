/* CounselNexus workflow modules - SQL Server, Dapper stored procedures, no EF. */
IF OBJECT_ID('dbo.PracticeWorkflowRecord', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PracticeWorkflowRecord
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PracticeWorkflowRecord PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FirmId UNIQUEIDENTIFIER NOT NULL,
        ModuleKey NVARCHAR(60) NOT NULL,
        Reference NVARCHAR(80) NOT NULL,
        PersonName NVARCHAR(250) NOT NULL,
        Subject NVARCHAR(500) NOT NULL,
        NextAction NVARCHAR(250) NULL,
        Status NVARCHAR(80) NOT NULL,
        Amount DECIMAL(18,2) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedBy NVARCHAR(120) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PracticeWorkflowRecord_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PracticeWorkflowRecord_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_PracticeWorkflowRecord_ModuleKey CHECK (ModuleKey IN ('debt-collections','evictions','drivers-appointments','summons-management')),
        CONSTRAINT UQ_PracticeWorkflowRecord_Reference UNIQUE (FirmId, ModuleKey, Reference)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PracticeWorkflowRecord_FirmModule' AND object_id = OBJECT_ID('dbo.PracticeWorkflowRecord'))
    CREATE INDEX IX_PracticeWorkflowRecord_FirmModule ON dbo.PracticeWorkflowRecord (FirmId, ModuleKey, Status, UpdatedAtUtc DESC);
GO

CREATE OR ALTER PROCEDURE dbo.usp_PracticeWorkflowRecord_List
    @FirmId UNIQUEIDENTIFIER, @ModuleKey NVARCHAR(60), @Search NVARCHAR(200) = NULL, @Status NVARCHAR(80) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, FirmId, ModuleKey, Reference, PersonName, Subject, NextAction, Status, Amount, Notes, CreatedBy, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.PracticeWorkflowRecord
    WHERE FirmId = @FirmId AND ModuleKey = @ModuleKey
      AND (@Search IS NULL OR @Search = '' OR Reference LIKE '%' + @Search + '%' OR PersonName LIKE '%' + @Search + '%' OR Subject LIKE '%' + @Search + '%' OR NextAction LIKE '%' + @Search + '%')
      AND (@Status IS NULL OR @Status = '' OR Status = @Status)
    ORDER BY UpdatedAtUtc DESC, Reference;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PracticeWorkflowRecord_Get
    @FirmId UNIQUEIDENTIFIER, @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (1) Id, FirmId, ModuleKey, Reference, PersonName, Subject, NextAction, Status, Amount, Notes, CreatedBy, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.PracticeWorkflowRecord WHERE FirmId = @FirmId AND Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PracticeWorkflowRecord_Save
    @FirmId UNIQUEIDENTIFIER, @Id UNIQUEIDENTIFIER = NULL, @ModuleKey NVARCHAR(60), @Reference NVARCHAR(80),
    @PersonName NVARCHAR(250), @Subject NVARCHAR(500), @NextAction NVARCHAR(250) = NULL, @Status NVARCHAR(80),
    @Amount DECIMAL(18,2) = NULL, @Notes NVARCHAR(MAX) = NULL, @CreatedBy NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Id IS NULL
    BEGIN
        SET @Id = NEWID();
        INSERT dbo.PracticeWorkflowRecord (Id,FirmId,ModuleKey,Reference,PersonName,Subject,NextAction,Status,Amount,Notes,CreatedBy)
        VALUES (@Id,@FirmId,@ModuleKey,@Reference,@PersonName,@Subject,@NextAction,@Status,@Amount,@Notes,@CreatedBy);
    END
    ELSE
    BEGIN
        UPDATE dbo.PracticeWorkflowRecord SET Reference=@Reference, PersonName=@PersonName, Subject=@Subject,
            NextAction=@NextAction, Status=@Status, Amount=@Amount, Notes=@Notes, UpdatedAtUtc=SYSUTCDATETIME()
        WHERE FirmId=@FirmId AND Id=@Id AND ModuleKey=@ModuleKey;
        IF @@ROWCOUNT = 0 RETURN;
    END;
    EXEC dbo.usp_PracticeWorkflowRecord_Get @FirmId=@FirmId, @Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PracticeWorkflowRecord_Delete
    @FirmId UNIQUEIDENTIFIER, @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.PracticeWorkflowRecord WHERE FirmId=@FirmId AND Id=@Id;
    SELECT CAST(@@ROWCOUNT AS INT) AS Affected;
END;
GO
