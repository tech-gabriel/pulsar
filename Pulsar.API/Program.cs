using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pulsar.API.External.Clients;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Health;
using Pulsar.API.OpenApi;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Repositories.Interfaces;
using Scalar.AspNetCore;
using Pulsar.API.Scheduler;
using Pulsar.API.Services;
using Pulsar.API.Services.Email;
using Pulsar.API.Services.Interfaces;
using Resend;

var builder = WebApplication.CreateBuilder(args);

// --- Controllers ---
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// --- OpenAPI / Swagger ---
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<PulsarDocumentTransformer>();
    options.AddOperationTransformer<SecurityOperationTransformer>();
});

// --- CORS ---
var frontendOrigins = "_frontendOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendOrigins, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",  // Vite dev server
                "http://localhost:3000"   // fallback CRA / outros
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// --- JWT Authentication ---
var jwtSecret = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey não configurada.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

// --- Database ---
builder.Services.AddDbContext<PulsarDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- HTTP Clients ---
builder.Services.AddHttpClient("openweathermap", (sp, client) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    client.BaseAddress = new Uri(config["OpenWeatherMap:BaseUrl"]
        ?? "https://api.openweathermap.org/data/2.5/");
    if (!client.BaseAddress.AbsoluteUri.EndsWith('/'))
        client.BaseAddress = new Uri(client.BaseAddress.AbsoluteUri + "/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddHttpClient("cgesp", client =>
{
    client.BaseAddress = new Uri("https://www.cgesp.org/v3/");
    client.Timeout = TimeSpan.FromSeconds(10);
    // Alguns servidores rejeitam requisições sem User-Agent.
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Pulsar/1.0 (+https://github.com/tech-gabriel/Pulsar)");
});

// --- Cache ---
builder.Services.AddMemoryCache();

// --- Health Checks ---
builder.Services.AddHealthChecks()
    .AddCheck<ColetaHealthCheck>("coleta", tags: new[] { "db", "coleta" });

// --- E-mail ---
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));
var emailProvider = builder.Configuration[$"{EmailOptions.SectionName}:Provider"] ?? "Log";
if (string.Equals(emailProvider, "Resend", StringComparison.OrdinalIgnoreCase))
{
    var apiKey = builder.Configuration[$"{EmailOptions.SectionName}:ApiKey"] ?? string.Empty;
    builder.Services.AddResend(o => o.ApiToken = apiKey);
    builder.Services.AddScoped<IEmailSender, ResendEmailSender>();
}
else
    builder.Services.AddScoped<IEmailSender, LogEmailSender>();

builder.Services.Configure<RecuperacaoSenhaOptions>(
    builder.Configuration.GetSection(RecuperacaoSenhaOptions.SectionName));

// --- Repositories ---
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IRegiaoRepository, RegiaoRepository>();
builder.Services.AddScoped<ISubprefeituraRepository, SubprefeituraRepository>();
builder.Services.AddScoped<ILeituraRepository, LeituraRepository>();
builder.Services.AddScoped<IScoreRepository, ScoreRepository>();
builder.Services.AddScoped<ISugestaoRepository, SugestaoRepository>();
builder.Services.AddScoped<IAlertaRepository, AlertaRepository>();
builder.Services.AddScoped<ITokenRecuperacaoSenhaRepository, TokenRecuperacaoSenhaRepository>();

// --- Services ---
builder.Services.AddScoped<IWeatherClient, OpenWeatherMapClient>();
builder.Services.AddScoped<INoticiaClient, CgespNoticiaClient>();
builder.Services.AddScoped<INoticiaService, NoticiaService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IClimateService, ClimateService>();
builder.Services.AddScoped<IScoreService, ScoreService>();
builder.Services.AddScoped<ISugestaoService, SugestaoService>();
builder.Services.AddScoped<IAlertaService, AlertaService>();

// --- Scheduler ---
builder.Services.AddHostedService<DataCollectionJob>();

// --- Build ---
var app = builder.Build();

// --- Migrations ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
    try { db.Database.Migrate(); }
    catch (InvalidOperationException) { db.Database.EnsureCreated(); }
}

// --- Middleware Pipeline ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "Pulsar API";
        options.Theme = Scalar.AspNetCore.ScalarTheme.DeepSpace;
    });
}

app.UseCors(frontendOrigins);
if (!app.Environment.IsEnvironment("Test"))
    app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = HealthResponseWriter.WriteAsync
});

app.Run();

public partial class Program { }
