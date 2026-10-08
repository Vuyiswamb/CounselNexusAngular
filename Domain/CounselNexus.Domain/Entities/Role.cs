using System;

namespace CounselNexus.Domain.Entities;

public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid FirmId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
