using System.Data;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/v1/platform/gateways")]
public sealed class PlatformGatewaySettingsController(IConfiguration configuration, IDataProtectionProvider protectionProvider) : ControllerBase
{
    private readonly IDataProtector protector = protectionProvider.CreateProtector("CounselNexus.PlatformGatewaySecrets.v1");

    [HttpGet]
    public async Task<ActionResult<PlatformGatewaySettingsDto>> Get(CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnection(cancellationToken);
        await using var command = new SqlCommand("SELECT TOP (1) * FROM dbo.PlatformGatewaySettings WHERE Id = 1", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound("Platform gateway settings have not been seeded.");
        return Ok(ReadDto(reader));
    }

    [HttpPut]
    public async Task<ActionResult<PlatformGatewaySettingsDto>> Save(PlatformGatewaySettingsUpdateRequest request, CancellationToken cancellationToken)
    {
        if (request.PayFastEnabled && string.IsNullOrWhiteSpace(request.PayFastMerchantId))
            return ValidationProblem("A PayFast merchant ID is required when PayFast is enabled.");

        await using var connection = await OpenConnection(cancellationToken);
        await using var command = new SqlCommand("SELECT TOP (1) * FROM dbo.PlatformGatewaySettings WHERE Id = 1", connection);
        await using var reader = await command.ExecuteReaderAsync(CommandBehavior.SingleRow, cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound("Platform gateway settings have not been seeded.");
        var current = ReadDto(reader);
        var merchantKey = ProtectOrKeep(request.PayFastMerchantKey, reader, "PayFastMerchantKey");
        var passphrase = ProtectOrKeep(request.PayFastPassphrase, reader, "PayFastPassphrase");
        await reader.CloseAsync();

        await using var update = new SqlCommand(@"UPDATE dbo.PlatformGatewaySettings SET
            PayFastEnabled=@enabled, PayFastSandbox=@sandbox, PayFastMerchantId=@merchantId,
            PayFastMerchantKey=@merchantKey, PayFastPassphrase=@passphrase, PayFastReturnUrl=@returnUrl,
            PayFastCancelUrl=@cancelUrl, UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=1", connection);
        update.Parameters.AddWithValue("@enabled", request.PayFastEnabled);
        update.Parameters.AddWithValue("@sandbox", request.PayFastSandbox);
        update.Parameters.AddWithValue("@merchantId", (object?)request.PayFastMerchantId ?? DBNull.Value);
        update.Parameters.Add("@merchantKey", SqlDbType.VarBinary, -1).Value = (object?)merchantKey ?? DBNull.Value;
        update.Parameters.Add("@passphrase", SqlDbType.VarBinary, -1).Value = (object?)passphrase ?? DBNull.Value;
        update.Parameters.AddWithValue("@returnUrl", (object?)request.PayFastReturnUrl ?? DBNull.Value);
        update.Parameters.AddWithValue("@cancelUrl", (object?)request.PayFastCancelUrl ?? DBNull.Value);
        await update.ExecuteNonQueryAsync(cancellationToken);
        return Ok(current with { PayFastEnabled = request.PayFastEnabled, PayFastSandbox = request.PayFastSandbox, PayFastMerchantId = request.PayFastMerchantId, PayFastReturnUrl = request.PayFastReturnUrl, PayFastCancelUrl = request.PayFastCancelUrl, PayFastMerchantKeyConfigured = merchantKey is not null, PayFastPassphraseConfigured = passphrase is not null });
    }

    private async Task<SqlConnection> OpenConnection(CancellationToken cancellationToken)
    {
        var connection = new SqlConnection(configuration.GetConnectionString("DefaultConnection"));
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private byte[]? ProtectOrKeep(string? value, SqlDataReader reader, string column)
    {
        if (!string.IsNullOrWhiteSpace(value)) return protector.Protect(value) is { } protectedValue ? System.Text.Encoding.UTF8.GetBytes(protectedValue) : null;
        return reader.IsDBNull(reader.GetOrdinal(column)) ? null : (byte[])reader[column];
    }

    private PlatformGatewaySettingsDto ReadDto(SqlDataReader reader) => new(
        reader.GetBoolean(reader.GetOrdinal("PayFastEnabled")), reader.GetBoolean(reader.GetOrdinal("PayFastSandbox")),
        reader.IsDBNull(reader.GetOrdinal("PayFastMerchantId")) ? null : reader.GetString(reader.GetOrdinal("PayFastMerchantId")),
        reader.IsDBNull(reader.GetOrdinal("PayFastMerchantKey")) ? null : "", !reader.IsDBNull(reader.GetOrdinal("PayFastMerchantKey")),
        !reader.IsDBNull(reader.GetOrdinal("PayFastPassphrase")), reader.IsDBNull(reader.GetOrdinal("PayFastReturnUrl")) ? null : reader.GetString(reader.GetOrdinal("PayFastReturnUrl")),
        reader.IsDBNull(reader.GetOrdinal("PayFastCancelUrl")) ? null : reader.GetString(reader.GetOrdinal("PayFastCancelUrl")),
        reader.GetBoolean(reader.GetOrdinal("SmsEnabled")),
        reader.IsDBNull(reader.GetOrdinal("SmsProvider")) ? null : reader.GetString(reader.GetOrdinal("SmsProvider")),
        reader.IsDBNull(reader.GetOrdinal("SmsBaseUrl")) ? null : reader.GetString(reader.GetOrdinal("SmsBaseUrl")),
        !reader.IsDBNull(reader.GetOrdinal("SmsApiKey")), !reader.IsDBNull(reader.GetOrdinal("SmsApiSecret")),
        reader.IsDBNull(reader.GetOrdinal("SmsFrom")) ? null : reader.GetString(reader.GetOrdinal("SmsFrom")));
}

public sealed record PlatformGatewaySettingsDto(bool PayFastEnabled, bool PayFastSandbox, string? PayFastMerchantId, string? PayFastMerchantKey, bool PayFastMerchantKeyConfigured, bool PayFastPassphraseConfigured, string? PayFastReturnUrl, string? PayFastCancelUrl, bool SmsEnabled, string? SmsProvider, string? SmsBaseUrl, bool SmsApiKeyConfigured, bool SmsApiSecretConfigured, string? SmsFrom);
public sealed record PlatformGatewaySettingsUpdateRequest(bool PayFastEnabled, bool PayFastSandbox, string? PayFastMerchantId, string? PayFastMerchantKey, string? PayFastPassphrase, string? PayFastReturnUrl, string? PayFastCancelUrl);
