/*
   CounselNexus Marketplace foundation.
   Additive and idempotent SQL Server migration. Run after the existing schema.
   No trust funds, lawyer payouts or platform commissions are modelled here.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'Marketplace')
    EXEC(N'CREATE SCHEMA Marketplace');
GO

IF OBJECT_ID(N'Marketplace.Organisations', N'U') IS NULL
BEGIN
    CREATE TABLE Marketplace.Organisations
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Marketplace_Organisations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Name nvarchar(200) NOT NULL,
        OrganisationType nvarchar(30) NOT NULL CONSTRAINT CK_Marketplace_OrganisationType CHECK (OrganisationType IN (N'Independent', N'LawFirm')),
        IsVerified bit NOT NULL CONSTRAINT DF_Marketplace_Organisations_IsVerified DEFAULT (0),
        IsActive bit NOT NULL CONSTRAINT DF_Marketplace_Organisations_IsActive DEFAULT (1),
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Marketplace_Organisations_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc datetime2(3) NULL
    );
END;
GO

IF OBJECT_ID(N'Marketplace.Practitioners', N'U') IS NULL
BEGIN
    CREATE TABLE Marketplace.Practitioners
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Marketplace_Practitioners PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        UserId uniqueidentifier NULL,
        OrganisationId uniqueidentifier NOT NULL,
        DisplayName nvarchar(200) NOT NULL,
        Biography nvarchar(2000) NULL,
        YearsExperience smallint NULL CONSTRAINT CK_Marketplace_Practitioners_Experience CHECK (YearsExperience IS NULL OR YearsExperience >= 0),
        Province nvarchar(80) NULL,
        City nvarchar(100) NULL,
        ConsultationMethods nvarchar(200) NULL,
        VerificationStatus nvarchar(30) NOT NULL CONSTRAINT DF_Marketplace_Practitioners_VerificationStatus DEFAULT (N'Pending'),
        IsActive bit NOT NULL CONSTRAINT DF_Marketplace_Practitioners_IsActive DEFAULT (1),
        RowVersion rowversion NOT NULL,
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Marketplace_Practitioners_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Marketplace_Practitioners_Organisation FOREIGN KEY (OrganisationId) REFERENCES Marketplace.Organisations(Id),
        CONSTRAINT CK_Marketplace_Practitioners_VerificationStatus CHECK (VerificationStatus IN (N'Pending', N'Verified', N'Suspended', N'Rejected'))
    );
    CREATE INDEX IX_Marketplace_Practitioners_PublicSearch ON Marketplace.Practitioners (VerificationStatus, IsActive, Province, City);
END;
GO

IF OBJECT_ID(N'Marketplace.PracticeAreas', N'U') IS NULL
BEGIN
    CREATE TABLE Marketplace.PracticeAreas
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Marketplace_PracticeAreas PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Name nvarchar(120) NOT NULL,
        Slug nvarchar(140) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Marketplace_PracticeAreas_IsActive DEFAULT (1),
        CONSTRAINT UQ_Marketplace_PracticeAreas_Slug UNIQUE (Slug)
    );
END;
GO

IF OBJECT_ID(N'Marketplace.PractitionerPracticeAreas', N'U') IS NULL
BEGIN
    CREATE TABLE Marketplace.PractitionerPracticeAreas
    (
        PractitionerId uniqueidentifier NOT NULL,
        PracticeAreaId uniqueidentifier NOT NULL,
        CONSTRAINT PK_Marketplace_PractitionerPracticeAreas PRIMARY KEY (PractitionerId, PracticeAreaId),
        CONSTRAINT FK_Marketplace_PractitionerPracticeAreas_Practitioner FOREIGN KEY (PractitionerId) REFERENCES Marketplace.Practitioners(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Marketplace_PractitionerPracticeAreas_PracticeArea FOREIGN KEY (PracticeAreaId) REFERENCES Marketplace.PracticeAreas(Id)
    );
END;
GO

IF OBJECT_ID(N'Marketplace.LegalRequests', N'U') IS NULL
BEGIN
    CREATE TABLE Marketplace.LegalRequests
    (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Marketplace_LegalRequests PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Reference nvarchar(24) NOT NULL,
        ClientUserId uniqueidentifier NULL,
        PracticeAreaId uniqueidentifier NOT NULL,
        Title nvarchar(160) NOT NULL,
        Description nvarchar(4000) NOT NULL,
        Province nvarchar(80) NOT NULL,
        City nvarchar(100) NOT NULL,
        Suburb nvarchar(100) NULL,
        Budget nvarchar(80) NULL,
        ConsultationMethod nvarchar(30) NOT NULL,
        Urgency nvarchar(20) NOT NULL CONSTRAINT DF_Marketplace_LegalRequests_Urgency DEFAULT (N'Normal'),
        Status nvarchar(30) NOT NULL CONSTRAINT DF_Marketplace_LegalRequests_Status DEFAULT (N'Submitted'),
        CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Marketplace_LegalRequests_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc datetime2(3) NULL,
        RowVersion rowversion NOT NULL,
        CONSTRAINT UQ_Marketplace_LegalRequests_Reference UNIQUE (Reference),
        CONSTRAINT FK_Marketplace_LegalRequests_PracticeArea FOREIGN KEY (PracticeAreaId) REFERENCES Marketplace.PracticeAreas(Id),
        CONSTRAINT CK_Marketplace_LegalRequests_ConsultationMethod CHECK (ConsultationMethod IN (N'Home', N'Business', N'Office', N'Online')),
        CONSTRAINT CK_Marketplace_LegalRequests_Urgency CHECK (Urgency IN (N'Low', N'Normal', N'Urgent')),
        CONSTRAINT CK_Marketplace_LegalRequests_Status CHECK (Status IN (N'Submitted', N'MatchingLawyers', N'ReceivingQuotations', N'Cancelled', N'Completed'))
    );
    CREATE INDEX IX_Marketplace_LegalRequests_Client ON Marketplace.LegalRequests (ClientUserId, CreatedAtUtc DESC);
    CREATE INDEX IX_Marketplace_LegalRequests_Matching ON Marketplace.LegalRequests (PracticeAreaId, Province, City, Status);
END;
GO

INSERT Marketplace.PracticeAreas (Name, Slug)
SELECT v.Name, v.Slug
FROM (VALUES
 (N'Divorce and Family Law', N'divorce-family-law'), (N'Criminal Defence', N'criminal-defence'),
 (N'Employment and Labour Law', N'employment-labour-law'), (N'Property and Conveyancing', N'property-conveyancing'),
 (N'Road Accident Fund Claims', N'road-accident-fund'), (N'Wills and Estates', N'wills-estates'),
 (N'Contracts and Agreements', N'contracts-agreements'), (N'Business and Commercial Law', N'business-commercial'),
 (N'Debt Collection', N'debt-collection'), (N'Consumer Protection', N'consumer-protection'),
 (N'Immigration Law', N'immigration-law'), (N'Civil Litigation', N'civil-litigation')
) v(Name, Slug)
WHERE NOT EXISTS (SELECT 1 FROM Marketplace.PracticeAreas p WHERE p.Slug = v.Slug);
GO

IF COL_LENGTH(N'Marketplace.LegalRequests', N'Phone') IS NULL
    ALTER TABLE Marketplace.LegalRequests ADD Phone nvarchar(40) NULL;
GO

IF COL_LENGTH(N'Marketplace.LegalRequests', N'Budget') IS NULL
    ALTER TABLE Marketplace.LegalRequests ADD Budget nvarchar(80) NULL;
GO

CREATE OR ALTER PROCEDURE Marketplace.usp_PublicPractitioners_List
    @PracticeAreaSlug nvarchar(140) = NULL,
    @Province nvarchar(80) = NULL,
    @City nvarchar(100) = NULL,
    @Take int = 12
AS
BEGIN
    SET NOCOUNT ON;
    SET @Take = CASE WHEN @Take BETWEEN 1 AND 50 THEN @Take ELSE 12 END;
    SELECT TOP (@Take)
        p.Id, p.DisplayName, o.Name AS OrganisationName, p.Biography, p.YearsExperience,
        p.Province, p.City, p.ConsultationMethods, p.VerificationStatus,
        STRING_AGG(pa.Name, N', ') WITHIN GROUP (ORDER BY pa.Name) AS PracticeAreas
    FROM Marketplace.Practitioners p
    INNER JOIN Marketplace.Organisations o ON o.Id = p.OrganisationId
    LEFT JOIN Marketplace.PractitionerPracticeAreas ppa ON ppa.PractitionerId = p.Id
    LEFT JOIN Marketplace.PracticeAreas pa ON pa.Id = ppa.PracticeAreaId
    WHERE p.IsActive = 1 AND p.VerificationStatus = N'Verified' AND o.IsActive = 1 AND o.IsVerified = 1
      AND (@PracticeAreaSlug IS NULL OR EXISTS (SELECT 1 FROM Marketplace.PractitionerPracticeAreas x INNER JOIN Marketplace.PracticeAreas a ON a.Id = x.PracticeAreaId WHERE x.PractitionerId = p.Id AND a.Slug = @PracticeAreaSlug))
      AND (@Province IS NULL OR p.Province = @Province)
      AND (@City IS NULL OR p.City = @City)
    GROUP BY p.Id, p.DisplayName, o.Name, p.Biography, p.YearsExperience, p.Province, p.City, p.ConsultationMethods, p.VerificationStatus
    ORDER BY p.DisplayName;
END;
GO

CREATE OR ALTER PROCEDURE Marketplace.usp_LegalRequest_Create
    @ClientUserId uniqueidentifier = NULL,
    @PracticeAreaSlug nvarchar(140),
    @Title nvarchar(160),
    @Description nvarchar(4000),
    @Province nvarchar(80),
    @City nvarchar(100),
    @Phone nvarchar(40),
    @Suburb nvarchar(100) = NULL,
    @Budget nvarchar(80) = NULL,
    @ConsultationMethod nvarchar(30),
    @Urgency nvarchar(20) = N'Normal'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @PracticeAreaId uniqueidentifier = (SELECT Id FROM Marketplace.PracticeAreas WHERE Slug = @PracticeAreaSlug AND IsActive = 1);
    IF @PracticeAreaId IS NULL THROW 51030, 'The selected practice area is not available.', 1;
    IF NULLIF(LTRIM(RTRIM(@Title)), N'') IS NULL OR NULLIF(LTRIM(RTRIM(@Description)), N'') IS NULL THROW 51031, 'Title and description are required.', 1;
    DECLARE @Id uniqueidentifier = NEWID();
    DECLARE @Reference nvarchar(24) = N'CN-' + UPPER(CONVERT(nvarchar(8), REPLACE(CONVERT(nvarchar(36), @Id), N'-', N'')));
    INSERT Marketplace.LegalRequests (Id, Reference, ClientUserId, PracticeAreaId, Title, Description, Province, City, Phone, Suburb, Budget, ConsultationMethod, Urgency)
    VALUES (@Id, @Reference, @ClientUserId, @PracticeAreaId, LTRIM(RTRIM(@Title)), LTRIM(RTRIM(@Description)), LTRIM(RTRIM(@Province)), LTRIM(RTRIM(@City)), LTRIM(RTRIM(@Phone)), NULLIF(LTRIM(RTRIM(@Suburb)), N''), NULLIF(LTRIM(RTRIM(@Budget)), N''), @ConsultationMethod, @Urgency);
    SELECT r.Id, r.Reference, r.Status, r.CreatedAtUtc, a.Name AS PracticeArea
    FROM Marketplace.LegalRequests r INNER JOIN Marketplace.PracticeAreas a ON a.Id = r.PracticeAreaId WHERE r.Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE Marketplace.usp_LegalRequest_List
    @Status nvarchar(30) = NULL,
    @Search nvarchar(200) = NULL,
    @Take int = 100
AS
BEGIN
    SET NOCOUNT ON;
    SET @Take = CASE WHEN @Take BETWEEN 1 AND 250 THEN @Take ELSE 100 END;
    SELECT TOP (@Take)
        r.Id, r.Reference, a.Name AS PracticeArea, r.Title, r.Description,
        r.Province, r.City, r.Suburb, r.Budget, r.ConsultationMethod, r.Urgency, r.Status,
        r.ClientUserId, r.CreatedAtUtc
    FROM Marketplace.LegalRequests r
    INNER JOIN Marketplace.PracticeAreas a ON a.Id = r.PracticeAreaId
    WHERE (@Status IS NULL OR r.Status = @Status)
      AND (@Search IS NULL OR r.Reference LIKE N'%' + @Search + N'%' OR r.Title LIKE N'%' + @Search + N'%' OR r.City LIKE N'%' + @Search + N'%' OR r.Province LIKE N'%' + @Search + N'%')
    ORDER BY r.CreatedAtUtc DESC;
END;
GO

/* Extend meeting locations without changing existing requests. */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Marketplace_LegalRequests_ConsultationMethod' AND parent_object_id = OBJECT_ID(N'Marketplace.LegalRequests'))
    ALTER TABLE Marketplace.LegalRequests DROP CONSTRAINT CK_Marketplace_LegalRequests_ConsultationMethod;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Marketplace_LegalRequests_ConsultationMethod' AND parent_object_id = OBJECT_ID(N'Marketplace.LegalRequests'))
    ALTER TABLE Marketplace.LegalRequests ADD CONSTRAINT CK_Marketplace_LegalRequests_ConsultationMethod CHECK (ConsultationMethod IN (N'Home', N'Business', N'Office', N'Online', N'PoliceStation', N'Court'));
GO

IF COL_LENGTH(N'Marketplace.LegalRequests', N'Phone') IS NULL
    ALTER TABLE Marketplace.LegalRequests ADD Phone nvarchar(40) NULL;
GO
