/* CounselNexus legal research corpus - SQL Server, no EF required. */
IF OBJECT_ID('dbo.LegalCase', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LegalCase
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LegalCase PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        SourceKey NVARCHAR(500) NOT NULL,
        SourceName NVARCHAR(120) NOT NULL,
        SourceUrl NVARCHAR(2000) NOT NULL,
        Citation NVARCHAR(500) NULL,
        CaseNumber NVARCHAR(200) NULL,
        Title NVARCHAR(1000) NOT NULL,
        Court NVARCHAR(250) NOT NULL,
        Jurisdiction NVARCHAR(120) NOT NULL CONSTRAINT DF_LegalCase_Jurisdiction DEFAULT 'South Africa',
        DateIssued DATE NULL,
        OutcomeSummary NVARCHAR(MAX) NULL,
        JudgmentText NVARCHAR(MAX) NULL,
        LanguageCode NVARCHAR(10) NOT NULL CONSTRAINT DF_LegalCase_LanguageCode DEFAULT 'en',
        ContentHash CHAR(64) NULL,
        ImportedBy NVARCHAR(120) NULL,
        ImportedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_LegalCase_ImportedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_LegalCase_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_LegalCase_SourceKey UNIQUE (SourceKey)
    );
END;
GO

/* The document table is created after the parent table on fresh databases. */
IF OBJECT_ID('dbo.LegalCaseDocument', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LegalCaseDocument
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LegalCaseDocument PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CaseId UNIQUEIDENTIFIER NOT NULL,
        FileName NVARCHAR(260) NOT NULL,
        ContentType NVARCHAR(150) NOT NULL,
        FileLength BIGINT NOT NULL,
        FileContent VARBINARY(MAX) NOT NULL,
        ExtractedText NVARCHAR(MAX) NULL,
        Sha256Hash CHAR(64) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_LegalCaseDocument_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_LegalCaseDocument_Case FOREIGN KEY (CaseId) REFERENCES dbo.LegalCase(Id)
    );
END;
GO

IF OBJECT_ID('dbo.LegalCaseChunk', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LegalCaseChunk
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LegalCaseChunk PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CaseId UNIQUEIDENTIFIER NOT NULL,
        DocumentId UNIQUEIDENTIFIER NULL,
        ChunkNumber INT NOT NULL,
        Heading NVARCHAR(500) NULL,
        ChunkText NVARCHAR(MAX) NOT NULL,
        EmbeddingJson NVARCHAR(MAX) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_LegalCaseChunk_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_LegalCaseChunk_Case FOREIGN KEY (CaseId) REFERENCES dbo.LegalCase(Id),
        CONSTRAINT FK_LegalCaseChunk_Document FOREIGN KEY (DocumentId) REFERENCES dbo.LegalCaseDocument(Id),
        CONSTRAINT UQ_LegalCaseChunk_Number UNIQUE (CaseId, DocumentId, ChunkNumber)
    );
END;
GO

IF OBJECT_ID('dbo.LegalResearchQuery', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LegalResearchQuery
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LegalResearchQuery PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        QueryText NVARCHAR(MAX) NOT NULL,
        PracticeArea NVARCHAR(200) NULL,
        Court NVARCHAR(250) NULL,
        OllamaModel NVARCHAR(120) NULL,
        CreatedBy NVARCHAR(120) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_LegalResearchQuery_CreatedAtUtc DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LegalCase_Search' AND object_id = OBJECT_ID('dbo.LegalCase'))
    CREATE INDEX IX_LegalCase_Search ON dbo.LegalCase (Court, Jurisdiction, DateIssued) INCLUDE (Title, Citation, OutcomeSummary, SourceUrl);
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalCase_Upsert
    @Id UNIQUEIDENTIFIER = NULL,
    @SourceKey NVARCHAR(500), @SourceName NVARCHAR(120), @SourceUrl NVARCHAR(2000),
    @Citation NVARCHAR(500) = NULL, @CaseNumber NVARCHAR(200) = NULL, @Title NVARCHAR(1000),
    @Court NVARCHAR(250), @Jurisdiction NVARCHAR(120) = 'South Africa', @DateIssued DATE = NULL,
    @OutcomeSummary NVARCHAR(MAX) = NULL, @JudgmentText NVARCHAR(MAX) = NULL,
    @LanguageCode NVARCHAR(10) = 'en', @ContentHash CHAR(64) = NULL, @ImportedBy NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CaseId UNIQUEIDENTIFIER = COALESCE(@Id, (SELECT Id FROM dbo.LegalCase WHERE SourceKey = @SourceKey));
    IF @CaseId IS NULL SET @CaseId = NEWSEQUENTIALID();

    MERGE dbo.LegalCase AS target
    USING (SELECT @CaseId Id) AS source ON target.Id = source.Id
    WHEN MATCHED THEN UPDATE SET SourceKey=@SourceKey, SourceName=@SourceName, SourceUrl=@SourceUrl,
        Citation=@Citation, CaseNumber=@CaseNumber, Title=@Title, Court=@Court, Jurisdiction=@Jurisdiction,
        DateIssued=@DateIssued, OutcomeSummary=@OutcomeSummary, JudgmentText=@JudgmentText,
        LanguageCode=@LanguageCode, ContentHash=@ContentHash, ImportedBy=@ImportedBy, UpdatedAtUtc=SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Id,SourceKey,SourceName,SourceUrl,Citation,CaseNumber,Title,Court,Jurisdiction,DateIssued,OutcomeSummary,JudgmentText,LanguageCode,ContentHash,ImportedBy)
        VALUES (@CaseId,@SourceKey,@SourceName,@SourceUrl,@Citation,@CaseNumber,@Title,@Court,@Jurisdiction,@DateIssued,@OutcomeSummary,@JudgmentText,@LanguageCode,@ContentHash,@ImportedBy);
    SELECT * FROM dbo.LegalCase WHERE Id = @CaseId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalCaseDocument_Add
    @CaseId UNIQUEIDENTIFIER, @FileName NVARCHAR(260), @ContentType NVARCHAR(150),
    @FileLength BIGINT, @FileContent VARBINARY(MAX), @ExtractedText NVARCHAR(MAX) = NULL, @Sha256Hash CHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.LegalCaseDocument (CaseId,FileName,ContentType,FileLength,FileContent,ExtractedText,Sha256Hash)
    VALUES (@CaseId,@FileName,@ContentType,@FileLength,@FileContent,@ExtractedText,@Sha256Hash);
    SELECT TOP (1) * FROM dbo.LegalCaseDocument WHERE CaseId=@CaseId ORDER BY CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalCaseDocument_List
    @CaseId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, CaseId, FileName, ContentType, FileLength, CreatedAtUtc
    FROM dbo.LegalCaseDocument
    WHERE CaseId = @CaseId
    ORDER BY CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalCaseDocument_Read
    @CaseId UNIQUEIDENTIFIER, @DocumentId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (1) Id, CaseId, FileName, ContentType, FileLength, FileContent, CreatedAtUtc
    FROM dbo.LegalCaseDocument
    WHERE CaseId = @CaseId AND Id = @DocumentId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LegalCase_Search
    @Query NVARCHAR(2000), @Court NVARCHAR(250) = NULL, @Take INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Take = CASE WHEN @Take BETWEEN 1 AND 100 THEN @Take ELSE 20 END;
    SELECT TOP (@Take) c.Id, c.SourceName, c.SourceUrl, c.Citation, c.CaseNumber, c.Title, c.Court,
        c.Jurisdiction, c.DateIssued, c.OutcomeSummary,
        CAST((CASE WHEN c.Title LIKE '%' + @Query + '%' THEN 50 ELSE 0 END
            + CASE WHEN c.Citation LIKE '%' + @Query + '%' THEN 25 ELSE 0 END
            + CASE WHEN c.OutcomeSummary LIKE '%' + @Query + '%' THEN 15 ELSE 0 END
            + CASE WHEN c.JudgmentText LIKE '%' + @Query + '%' THEN 10 ELSE 0 END) AS INT) AS Relevance
    FROM dbo.LegalCase c
    WHERE c.Jurisdiction = 'South Africa'
      AND (@Court IS NULL OR c.Court = @Court)
      AND (@Query IS NULL OR @Query = '' OR c.Title LIKE '%' + @Query + '%' OR c.Citation LIKE '%' + @Query + '%'
           OR c.OutcomeSummary LIKE '%' + @Query + '%' OR c.JudgmentText LIKE '%' + @Query + '%')
    ORDER BY Relevance DESC, c.DateIssued DESC, c.Title;
END;
GO
