/* Backwards-compatible contact name migration.
   Run this against the CounselNexus database before deploying the API contract update. */
SET XACT_ABORT ON;
GO

IF COL_LENGTH(N'dbo.Contacts', N'FirstName') IS NULL
    ALTER TABLE dbo.Contacts ADD FirstName nvarchar(100) NULL;
GO

IF COL_LENGTH(N'dbo.Contacts', N'Surname') IS NULL
    ALTER TABLE dbo.Contacts ADD Surname nvarchar(150) NULL;
GO

/* Preserve existing records while the API transitions away from FullName. */
UPDATE dbo.Contacts
SET FirstName = CASE
        WHEN NULLIF(LTRIM(RTRIM(FirstName)), N'') IS NOT NULL THEN FirstName
        WHEN CHARINDEX(N' ', LTRIM(RTRIM(FullName))) > 0 THEN LEFT(LTRIM(RTRIM(FullName)), CHARINDEX(N' ', LTRIM(RTRIM(FullName))) - 1)
        ELSE LTRIM(RTRIM(FullName))
    END,
    Surname = CASE
        WHEN NULLIF(LTRIM(RTRIM(Surname)), N'') IS NOT NULL THEN Surname
        WHEN CHARINDEX(N' ', LTRIM(RTRIM(FullName))) > 0 THEN LTRIM(SUBSTRING(LTRIM(RTRIM(FullName)), CHARINDEX(N' ', LTRIM(RTRIM(FullName))) + 1, 150))
        ELSE N''
    END
WHERE NULLIF(LTRIM(RTRIM(FullName)), N'') IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Contacts') AND name = N'IX_Contacts_Firm_FirstName_Surname')
    CREATE INDEX IX_Contacts_Firm_FirstName_Surname
        ON dbo.Contacts(FirmId, FirstName, Surname)
        WHERE FirstName IS NOT NULL AND Surname IS NOT NULL;
GO
