namespace CounselNexus.Api;

public sealed class OllamaOptions
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model { get; set; } = "qwen3:14b";
    public IReadOnlyList<CaseLawSource> Sources { get; set; } = new List<CaseLawSource>();
}

public sealed class CaseLawSource
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Court { get; set; } = string.Empty;
}
