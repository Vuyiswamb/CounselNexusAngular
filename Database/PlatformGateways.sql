IF OBJECT_ID(N'dbo.PlatformGatewaySettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PlatformGatewaySettings
    (
        Id tinyint NOT NULL CONSTRAINT PK_PlatformGatewaySettings PRIMARY KEY CONSTRAINT CK_PlatformGatewaySettings_Id CHECK (Id = 1),
        PayFastEnabled bit NOT NULL CONSTRAINT DF_PlatformGatewaySettings_PayFastEnabled DEFAULT (0),
        PayFastSandbox bit NOT NULL CONSTRAINT DF_PlatformGatewaySettings_PayFastSandbox DEFAULT (1),
        PayFastMerchantId nvarchar(100) NULL,
        PayFastMerchantKey varbinary(max) NULL,
        PayFastPassphrase varbinary(max) NULL,
        PayFastReturnUrl nvarchar(500) NULL,
        PayFastCancelUrl nvarchar(500) NULL,
        SmsEnabled bit NOT NULL CONSTRAINT DF_PlatformGatewaySettings_SmsEnabled DEFAULT (0),
        SmsProvider nvarchar(100) NULL,
        SmsBaseUrl nvarchar(500) NULL,
        SmsApiKey varbinary(max) NULL,
        SmsApiSecret varbinary(max) NULL,
        SmsFrom nvarchar(100) NULL,
        UpdatedAtUtc datetime2 NOT NULL CONSTRAINT DF_PlatformGatewaySettings_UpdatedAtUtc DEFAULT (SYSUTCDATETIME())
    );
END;
IF COL_LENGTH(N'dbo.PlatformGatewaySettings', N'PayFastSandboxEnabled') IS NULL
    ALTER TABLE dbo.PlatformGatewaySettings ADD PayFastSandboxEnabled bit NOT NULL CONSTRAINT DF_PlatformGatewaySettings_PayFastSandboxEnabled DEFAULT (1);
IF COL_LENGTH(N'dbo.PlatformGatewaySettings', N'PayFastLiveEnabled') IS NULL
    ALTER TABLE dbo.PlatformGatewaySettings ADD PayFastLiveEnabled bit NOT NULL CONSTRAINT DF_PlatformGatewaySettings_PayFastLiveEnabled DEFAULT (0);
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformGatewaySettings WHERE Id=1)
    INSERT dbo.PlatformGatewaySettings (Id) VALUES (1);

IF OBJECT_ID(N'dbo.PayFastGatewayEnvironments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PayFastGatewayEnvironments
    (
        Id tinyint NOT NULL CONSTRAINT PK_PayFastGatewayEnvironments PRIMARY KEY CONSTRAINT CK_PayFastGatewayEnvironments_Id CHECK (Id IN (1,2)),
        EnvironmentName nvarchar(20) NOT NULL,
        Enabled bit NOT NULL CONSTRAINT DF_PayFastGatewayEnvironments_Enabled DEFAULT (0),
        MerchantId nvarchar(100) NULL,
        MerchantKey nvarchar(200) NULL,
        Passphrase nvarchar(2000) NULL,
        ProcessUrl nvarchar(500) NULL,
        ReturnUrl nvarchar(500) NULL,
        CancelUrl nvarchar(500) NULL,
        UpdatedAtUtc datetime2 NOT NULL CONSTRAINT DF_PayFastGatewayEnvironments_UpdatedAtUtc DEFAULT (SYSUTCDATETIME())
    );
END;

IF COL_LENGTH(N'dbo.PayFastGatewayEnvironments', N'ProcessUrl') IS NULL
    ALTER TABLE dbo.PayFastGatewayEnvironments ADD ProcessUrl nvarchar(500) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.PayFastGatewayEnvironments WHERE Id=1)
    INSERT dbo.PayFastGatewayEnvironments (Id,EnvironmentName,Enabled,MerchantId,ProcessUrl,ReturnUrl,CancelUrl)
    SELECT 1,N'Sandbox',ISNULL(PayFastEnabled,0),PayFastMerchantId,N'https://sandbox.payfast.co.za/eng/process',N'https://www.counselnexus.co.za/login?payment=success',PayFastCancelUrl FROM dbo.PlatformGatewaySettings WHERE Id=1;
IF NOT EXISTS (SELECT 1 FROM dbo.PayFastGatewayEnvironments WHERE Id=2)
    INSERT dbo.PayFastGatewayEnvironments (Id,EnvironmentName,Enabled,ReturnUrl,CancelUrl)
    VALUES (2,N'Live',0,N'https://www.counselnexus.co.za/login?payment=success',N'https://www.counselnexus.co.za/packages?payment=cancelled');

UPDATE dbo.PayFastGatewayEnvironments
SET ReturnUrl=N'https://www.counselnexus.co.za/login?payment=success', CancelUrl=N'https://www.counselnexus.co.za/packages?payment=cancelled'
WHERE ReturnUrl IN (N'https://sandbox.payfast.co.za/eng/process', N'https://www.payfast.co.za/eng/process');

UPDATE dbo.PayFastGatewayEnvironments SET ProcessUrl=CASE WHEN Id=1 THEN N'https://sandbox.payfast.co.za/eng/process' ELSE N'https://www.payfast.co.za/eng/process' END WHERE ProcessUrl IS NULL;
