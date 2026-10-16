using CounselNexus.Api;
using CounselNexus.Domain.Interfaces;
using CounselNexus.Infrastructure;
using CounselNexus.Infrastructure.Repositories;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddDataProtection();
builder.Services.Configure<OllamaOptions>(builder.Configuration.GetSection("Ollama"));
builder.Services.AddHttpClient("Ollama", (serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<IOptions<OllamaOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromMinutes(5);
});
const string FrontendCorsPolicy = "FrontendCorsPolicy";
var allowedOrigins = new[]
{
    "http://localhost:4200",
    "https://localhost:4200",
    "https://www.counselnexus.co.za",
    "https://counselnexus.co.za"
};
builder.Services.AddScoped<IDataLayer>(_ => new DataLayer(
    builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.")));
builder.Services.AddScoped<IFirmRepository, FirmRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IPermissionRepository, PermissionRepository>();
builder.Services.AddCors(options => options.AddPolicy(FrontendCorsPolicy, policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
app.MapControllers();
app.Run();
