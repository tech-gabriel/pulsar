using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pulsar.API.External.Clients;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Repositories.Interfaces;
using Scalar.AspNetCore;
using Pulsar.API.Scheduler;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// --- Controllers ---
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// --- OpenAPI / Swagger ---
builder.Services.AddOpenApi();

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

// --- Repositories ---
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IRegiaoRepository, RegiaoRepository>();
builder.Services.AddScoped<ISubprefeituraRepository, SubprefeituraRepository>();
builder.Services.AddScoped<ILeituraRepository, LeituraRepository>();
builder.Services.AddScoped<IScoreRepository, ScoreRepository>();
builder.Services.AddScoped<ISugestaoRepository, SugestaoRepository>();
builder.Services.AddScoped<IAlertaRepository, AlertaRepository>();

// --- Services ---
builder.Services.AddScoped<IWeatherClient, OpenWeatherMapClient>();
builder.Services.AddScoped<IAuthService, AuthService>();
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

app.Run();

public partial class Program { }
