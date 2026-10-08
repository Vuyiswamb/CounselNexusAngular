using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CounselNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/v1/case-research")]
public sealed class CaseResearchController(
    IHttpClientFactory httpClientFactory,
    IDataLayer dataLayer,
    IOptions<OllamaOptions> ollamaOptions,
    ILogger<CaseResearchController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CaseResearchResponse>> Research(
        CaseResearchRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) &&
            string.IsNullOrWhiteSpace(request.Facts) &&
            string.IsNullOrWhiteSpace(request.LegalIssues))
        {
            return ValidationProblem("A case title, facts, or legal issues are required.");
        }

        var options = ollamaOptions.Value;
        IReadOnlyList<LegalCaseSearchRow> authorities;
        try
        {
            var databaseQuery = string.Join(' ', new[] { request.Title, request.PracticeArea, request.LegalIssues }
                .Where(value => !string.IsNullOrWhiteSpace(value))).Trim();
            authorities = string.IsNullOrWhiteSpace(databaseQuery)
                ? Array.Empty<LegalCaseSearchRow>()
                : (await dataLayer.ExecuteStoredProcedureAsync<LegalCaseSearchRow>(
                    "dbo.usp_LegalCase_Search", new { Query = databaseQuery[..Math.Min(databaseQuery.Length, 500)], Court = (string?)null, Take = 10 })).ToList();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "The legal case corpus could not be searched. The database schema may not have been deployed.");
            authorities = Array.Empty<LegalCaseSearchRow>();
        }

        var prompt = BuildPrompt(request, options.Sources, authorities);
        var payload = new
        {
            model = options.Model,
            prompt,
            stream = false,
            options = new { temperature = 0.1 }
        };

        try
        {
            var client = httpClientFactory.CreateClient("Ollama");
            using var response = await client.PostAsJsonAsync("api/generate", payload, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Ollama returned {StatusCode}: {Body}", response.StatusCode, body);
                return Problem("The AI Server could not complete the case research request.", statusCode: 502);
            }

            using var json = JsonDocument.Parse(body);
            var answer = json.RootElement.TryGetProperty("response", out var responseProperty)
                ? responseProperty.GetString()
                : null;

            if (string.IsNullOrWhiteSpace(answer))
                return Problem("The AI Server returned an empty research response.", statusCode: 502);

            return Ok(new CaseResearchResponse(options.Model, answer, "South African jurisdiction requested; verify every authority against an approved legal source.", options.Sources, authorities));
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Could not connect to Ollama at {BaseUrl}", options.BaseUrl);
            return Problem("The AI Server is not reachable. Start the AI Server and confirm the configured address.", statusCode: 503);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Problem("The AI Server took too long to respond.", statusCode: 504);
        }
    }

    private static string BuildPrompt(CaseResearchRequest request, IReadOnlyList<CaseLawSource> configuredSources, IReadOnlyList<LegalCaseSearchRow> authorities)
    {
        var matters = request.InternalMatters.Count == 0
            ? "No internal matter summaries were supplied. Do not invent or cite cases."
            : string.Join("\n", request.InternalMatters.Select(m => $"- {m.Reference}: {m.Title}; practice area: {m.PracticeArea}; status: {m.Status}"));

        var sourcesToUse = configuredSources.Count > 0 ? configuredSources : request.ApprovedSources;
        var sources = sourcesToUse.Count == 0
            ? "No source catalogue was configured. Do not claim that any judgment was retrieved."
            : string.Join("\n", sourcesToUse.Select(s => $"- {s.Name} ({s.Court}): {s.Url}"));
        var retrievedAuthorities = authorities.Count == 0
            ? "No matching judgment records were found in the local corpus. Do not invent authorities."
            : string.Join("\n", authorities.Select(a => $"- {a.Title}; citation: {a.Citation ?? "not recorded"}; court: {a.Court}; date: {a.DateIssued:yyyy-MM-dd}; outcome: {a.OutcomeSummary ?? "not recorded"}; source: {a.SourceUrl}"));

        return $"""
You are a cautious South African legal research assistant. Analyse the current case below.

Jurisdiction: SOUTH AFRICA ONLY.
Current case title: {request.Title}
Practice area: {request.PracticeArea}
Jurisdiction detail: {request.Jurisdiction}
Material facts: {request.Facts}
Legal issues: {request.LegalIssues}
Outcome being researched: {request.DesiredOutcome}

Internal matter records (these are not reported judgments and must not be presented as authorities):
{matters}

Approved primary-source catalogue for South African authorities:
{sources}

Retrieved South African judgment records from the local database:
{retrievedAuthorities}

Rules:
1. Do not invent case names, citations, court decisions, facts, holdings, or outcomes.
2. If no verified South African authority is supplied, explicitly say that verified authorities were not supplied.
3. You may only identify a case as a retrieved authority when it appears in the retrieved judgment records above.
4. Distinguish clearly between legal principles, possible research leads, and confirmed outcomes.
5. Mention that a legal practitioner must verify all authorities and current law.
6. Give a concise answer with these headings: Similarity assessment, South African research leads, Outcomes, Verification warning.
7. Never invent a document, PDF, download, URL, citation, or link. Never use example.com or placeholder links. If no verified document is supplied, say that no verified document is available for download.
8. Only refer to a downloadable document when it appears in the retrieved records or approved sources.
""";
    }
}

public sealed class CaseResearchRequest
{
    public string? Title { get; init; }
    public string? Facts { get; init; }
    public string? LegalIssues { get; init; }
    public string? PracticeArea { get; init; }
    public string? Jurisdiction { get; init; }
    public string? DesiredOutcome { get; init; }
    public IReadOnlyList<InternalMatterContext> InternalMatters { get; init; } = Array.Empty<InternalMatterContext>();
    public IReadOnlyList<CaseLawSource> ApprovedSources { get; init; } = Array.Empty<CaseLawSource>();
}

public sealed record InternalMatterContext(string Reference, string Title, string PracticeArea, string Status);

public sealed record CaseResearchResponse(string Model, string Answer, string ScopeNotice, IReadOnlyList<CaseLawSource> Sources, IReadOnlyList<LegalCaseSearchRow> Authorities);
