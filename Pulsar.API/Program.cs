using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
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
using Pulsar.API.Services.Push;
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
// Origens permitidas vêm de config (Cors:AllowedOrigins). Em desenvolvimento,
// caímos para os defaults locais quando a chave não está presente.
var frontendOrigins = "_frontendOrigins";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[]
    {
        "http://localhost:5173",  // Vite dev server
        "http://localhost:3000"   // fallback CRA / outros
    };
}
builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendOrigins, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// --- Rate Limiting ---
// Protege os endpoints sensíveis de autenticação (login, cadastro, reset de
// senha) contra brute-force/abuso. Particionado por IP de origem.
const string authRateLimit = "auth";
const string buscaRateLimit = "busca";
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(authRateLimit, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    // Busca de endereços: autocomplete gera muitas chamadas; limitamos por IP
    // para proteger a quota do provedor de geocoding (MapTiler).
    options.AddPolicy(buscaRateLimit, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            // MapInboundClaims = false desativa o remapeamento; declaramos o tipo de
            // claim de role explicitamente para que [Authorize(Roles="...")] funcione.
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

// --- Database ---
builder.Services.AddDbContext<PulsarDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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

builder.Services.AddHttpClient("maptiler", client =>
{
    client.BaseAddress = new Uri("https://api.maptiler.com/geocoding/");
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Pulsar/1.0 (+https://github.com/tech-gabriel/Pulsar)");
});

builder.Services.AddHttpClient("geosampa", client =>
{
    client.BaseAddress = new Uri("https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/");
    client.Timeout = TimeSpan.FromSeconds(60);
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
builder.Services.AddScoped<IAssinaturaPushRepository, AssinaturaPushRepository>();
builder.Services.AddScoped<IOcorrenciaAlagamentoRepository, OcorrenciaAlagamentoRepository>();
builder.Services.AddScoped<IAgregadoDiarioRepository, AgregadoDiarioRepository>();

// --- Services ---
builder.Services.AddScoped<IWeatherClient, OpenWeatherMapClient>();
builder.Services.AddScoped<INoticiaClient, CgespNoticiaClient>();
builder.Services.AddScoped<IGeoSampaClient, GeoSampaClient>();
builder.Services.AddScoped<INoticiaService, NoticiaService>();
builder.Services.AddScoped<IGeocodingClient, MapTilerGeocodingClient>();
builder.Services.AddScoped<IBuscaService, BuscaService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<ISistemaService, SistemaService>();
builder.Services.AddScoped<IColetaRunner, ColetaRunner>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IClimateService, ClimateService>();
builder.Services.AddScoped<IScoreService, ScoreService>();
builder.Services.AddScoped<ISugestaoService, SugestaoService>();
builder.Services.AddScoped<IAlertaService, AlertaService>();
builder.Services.AddScoped<IOcorrenciaIngestionService, OcorrenciaIngestionService>();
builder.Services.AddScoped<IOcorrenciaConsultaService, OcorrenciaConsultaService>();

// --- Web Push (notificações) ---
// Gated por config: sem chaves VAPID (Push:PublicKey/PrivateKey) o serviço fica
// inerte e o frontend esconde o opt-in. Chave privada só em User Secrets/env var.
builder.Services.Configure<PushOptions>(builder.Configuration.GetSection(PushOptions.SectionName));
builder.Services.AddScoped<IPushNotificationService, WebPushNotificationService>();

// --- Forwarded Headers ---
// Em produção o app roda atrás do proxy da plataforma (Render/Railway/etc.), que
// termina o TLS e encaminha o IP e o esquema originais via X-Forwarded-For/Proto.
// Sem isso, o rate limiter particiona por IP do proxy (throttle global) e o app
// "acha" que a requisição é HTTP. KnownNetworks/KnownProxies ficam vazios porque
// o IP do proxy é dinâmico em PaaS.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Confia em UM ÚNICO salto (o proxy da plataforma). O Render anexa o IP real
    // do cliente como a última entrada do X-Forwarded-For; com ForwardLimit=1 o
    // ASP.NET usa essa entrada e ignora qualquer valor que o cliente tenha
    // injetado à esquerda — fecha a evasão de rate limit por header forjado.
    options.ForwardLimit = 1;
    // KnownProxies/KnownIPNetworks ficam vazios porque o IP do proxy é dinâmico
    // em PaaS; o ForwardLimit=1 é o que limita a confiança.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// --- Scheduler ---
builder.Services.AddHostedService<DataCollectionJob>();

// --- Build ---
var app = builder.Build();

// --- Migrations ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
    // Testes usam SQLite in-memory (sem migrations Npgsql): cria o schema a
    // partir do modelo. Produção/dev aplica as migrations Postgres.
    if (app.Environment.IsEnvironment("Test"))
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();
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

// --- Cabeçalhos de segurança ---
// Defense-in-depth nas respostas da API (JSON). O frontend (static site) tem CSP
// e headers próprios no render.yaml; aqui blindamos o backend caso seja acessado
// direto pela URL pública. CSP restrita: a API nunca serve documento navegável.
var isDev = app.Environment.IsDevelopment();
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    // CSP restrita só fora de Development: em dev o Scalar UI é servido pelo
    // backend e precisa de scripts/estilos próprios (default-src 'none' o quebra).
    if (!isDev)
        headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

app.UseCors(frontendOrigins);
if (!app.Environment.IsEnvironment("Test"))
{
    // Antes de HttpsRedirection/RateLimiter para que ambos enxerguem o esquema e
    // o IP reais do cliente (e não os do proxy da plataforma).
    app.UseForwardedHeaders();
    // HSTS só fora de Development: instrui o navegador a só falar HTTPS com a API.
    // O proxy da plataforma já termina o TLS; isto reforça via cabeçalho.
    if (!app.Environment.IsDevelopment())
        app.UseHsts();
    app.UseHttpsRedirection();
    app.UseRateLimiter();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = HealthResponseWriter.WriteAsync
});

app.Run();

public partial class Program { }
