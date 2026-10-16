using CounselNexus.Domain.Interfaces;
using CounselNexus.Domain.Marketplace;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/marketplace")]
public sealed class MarketplaceController(IDataLayer dataLayer) : ControllerBase
{
    [HttpGet("requests")]
    [ProducesResponseType(typeof(IEnumerable<LegalRequestListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LegalRequestListItemDto>>> Requests(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int take = 100)
    {
        var rows = await dataLayer.ExecuteStoredProcedureAsync<LegalRequestListItemDto>(
            "Marketplace.usp_LegalRequest_List",
            new { Status = NullIfBlank(status), Search = NullIfBlank(search), Take = take });
        return Ok(rows);
    }

    [HttpGet("practitioners")]
    [ProducesResponseType(typeof(IEnumerable<PublicPractitionerDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PublicPractitionerDto>>> Practitioners(
        [FromQuery] string? practiceArea,
        [FromQuery] string? province,
        [FromQuery] string? city,
        [FromQuery] int take = 12)
    {
        var rows = await dataLayer.ExecuteStoredProcedureAsync<PublicPractitionerDto>(
            "Marketplace.usp_PublicPractitioners_List",
            new { PracticeAreaSlug = NullIfBlank(practiceArea), Province = NullIfBlank(province), City = NullIfBlank(city), Take = take });
        return Ok(rows);
    }

    [HttpPost("requests")]
    [ProducesResponseType(typeof(LegalRequestCreatedDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<LegalRequestCreatedDto>> CreateRequest([FromBody] LegalRequestCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PracticeAreaSlug) || string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Description) || string.IsNullOrWhiteSpace(request.Province) ||
            string.IsNullOrWhiteSpace(request.City) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.ConsultationMethod))
            return ValidationProblem("Practice area, title, description, phone number, location and consultation method are required.");

        if (!new[] { "Home", "Business", "Office", "Online", "PoliceStation", "Court" }.Contains(request.ConsultationMethod, StringComparer.OrdinalIgnoreCase))
            return ValidationProblem("Select a valid consultation method.");

        var clientUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await dataLayer.ExecuteStoredProcedureSingleAsync<LegalRequestCreatedDto>(
            "Marketplace.usp_LegalRequest_Create",
            new
            {
                ClientUserId = Guid.TryParse(clientUserId, out var id) ? id : (Guid?)null,
                PracticeAreaSlug = request.PracticeAreaSlug.Trim(),
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                Province = request.Province.Trim(),
                City = request.City.Trim(),
                Phone = request.Phone.Trim(),
                Suburb = NullIfBlank(request.Suburb),
                Budget = NullIfBlank(request.Budget),
                ConsultationMethod = request.ConsultationMethod,
                Urgency = string.IsNullOrWhiteSpace(request.Urgency) ? "Normal" : request.Urgency
            });
        return result is null ? Problem("The legal request could not be created.") : Created($"api/marketplace/requests/{result.Id}", result);
    }

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
