namespace CounselNexus.Api.Dtos;

public class AuthResponse
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? Message { get; set; }
    public string? UserName { get; set; }
}
