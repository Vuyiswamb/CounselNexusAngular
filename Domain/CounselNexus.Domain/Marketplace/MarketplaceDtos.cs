namespace CounselNexus.Domain.Marketplace;

public sealed class PublicPractitionerDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string OrganisationName { get; set; } = string.Empty;
    public string? Biography { get; set; }
    public short? YearsExperience { get; set; }
    public string? Province { get; set; }
    public string? City { get; set; }
    public string? ConsultationMethods { get; set; }
    public string VerificationStatus { get; set; } = string.Empty;
    public string? PracticeAreas { get; set; }
}

public sealed class LegalRequestCreateRequest
{
    public string? PracticeAreaSlug { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Province { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
    public string? Suburb { get; set; }
    public string? Budget { get; set; }
    public string? ConsultationMethod { get; set; }
    public string? Urgency { get; set; }
}

public sealed class LegalRequestCreatedDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public string PracticeArea { get; set; } = string.Empty;
}

public sealed class LegalRequestListItemDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string PracticeArea { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Suburb { get; set; }
    public string? Budget { get; set; }
    public string ConsultationMethod { get; set; } = string.Empty;
    public string Urgency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? ClientUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
