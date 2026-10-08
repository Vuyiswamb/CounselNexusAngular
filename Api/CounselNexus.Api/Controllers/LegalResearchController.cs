using CounselNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/v1/legal-research")]
public sealed class LegalResearchController(IDataLayer dataLayer) : ControllerBase
{
    [HttpGet("cases/search")]
    public async Task<ActionResult<IReadOnlyList<LegalCaseSearchRow>>> Search(
        [FromQuery] string query, [FromQuery] string? court = null, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(query)) return BadRequest("A search query is required.");
        var rows = await dataLayer.ExecuteStoredProcedureAsync<LegalCaseSearchRow>(
            "dbo.usp_LegalCase_Search", new { Query = query.Trim(), Court = court, Take = take });
        return Ok(rows.ToList());
    }

    [HttpPost("cases")]
    public async Task<ActionResult<LegalCaseUpsertRow>> Upsert(LegalCaseUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SourceKey) || string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Court))
            return ValidationProblem("SourceKey, Title, and Court are required.");
        if (!string.Equals(request.Jurisdiction, "South Africa", StringComparison.OrdinalIgnoreCase))
            return ValidationProblem("Only South African cases may be added to this corpus.");

        var row = await dataLayer.ExecuteStoredProcedureSingleAsync<LegalCaseUpsertRow>(
            "dbo.usp_LegalCase_Upsert", request with { Jurisdiction = "South Africa" });
        return Ok(row);
    }

    [HttpPost("cases/{caseId:guid}/documents")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> AddDocument(Guid caseId, IFormFile file, [FromForm] string? extractedText = null)
    {
        if (file is null || file.Length == 0) return BadRequest("A non-empty judgment attachment is required.");
        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory);
        await dataLayer.ExecuteStoredProcedureAsync("dbo.usp_LegalCaseDocument_Add", new
        {
            CaseId = caseId,
            FileName = file.FileName,
            ContentType = file.ContentType ?? "application/octet-stream",
            FileLength = file.Length,
            FileContent = memory.ToArray(),
            ExtractedText = extractedText,
            Sha256Hash = (string?)null,
        });
        return Accepted(new { caseId, file.FileName });
    }

    [HttpGet("cases/{caseId:guid}/documents")]
    public async Task<ActionResult<IReadOnlyList<LegalCaseDocumentRow>>> ListDocuments(Guid caseId)
    {
        var rows = await dataLayer.ExecuteStoredProcedureAsync<LegalCaseDocumentRow>(
            "dbo.usp_LegalCaseDocument_List", new { CaseId = caseId });
        return Ok(rows.ToList());
    }

    [HttpGet("cases/{caseId:guid}/documents/{documentId:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid caseId, Guid documentId)
    {
        var document = await dataLayer.ExecuteStoredProcedureSingleAsync<LegalCaseDocumentDownloadRow>(
            "dbo.usp_LegalCaseDocument_Read", new { CaseId = caseId, DocumentId = documentId });
        return document is null
            ? NotFound()
            : File(document.FileContent, document.ContentType, document.FileName);
    }
}

public sealed record LegalCaseUpsertRequest(
    Guid? Id,
    string SourceKey,
    string SourceName,
    string SourceUrl,
    string? Citation,
    string? CaseNumber,
    string Title,
    string Court,
    string Jurisdiction,
    DateTime? DateIssued,
    string? OutcomeSummary,
    string? JudgmentText,
    string? LanguageCode,
    string? ContentHash,
    string? ImportedBy);

public class LegalCaseSearchRow
{
    public Guid Id { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string? Citation { get; set; }
    public string? CaseNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Court { get; set; } = string.Empty;
    public string Jurisdiction { get; set; } = "South Africa";
    public DateTime? DateIssued { get; set; }
    public string? OutcomeSummary { get; set; }
    public int Relevance { get; set; }
}

public sealed class LegalCaseUpsertRow : LegalCaseSearchRow
{
    public string? ContentHash { get; set; }
}

public class LegalCaseDocumentRow
{
    public Guid Id { get; set; }
    public Guid CaseId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileLength { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class LegalCaseDocumentDownloadRow : LegalCaseDocumentRow
{
    public byte[] FileContent { get; set; } = Array.Empty<byte>();
}
