using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Scheduler;

namespace Pulsar.Tests.Helpers;

/// <summary>
/// Factory para testes de integração. Usa SQLite in-memory com conexão
/// compartilhada para manter dados entre requisições dentro de um mesmo teste.
/// </summary>
public class PulsarWebApplicationFactory : WebApplicationFactory<Program>
{
    // Conexão persistida durante toda a sessão de testes da fixture
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public PulsarWebApplicationFactory() => _connection.Open();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"]       = "pulsar-chave-secreta-para-testes-unitarios-longa-o-suficiente-32chars",
                ["Jwt:Issuer"]          = "Pulsar.Tests",
                ["Jwt:Audience"]        = "Pulsar.Tests",
                ["Jwt:ExpirationHours"] = "1",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Substituir DbContext SQLite por SQLite in-memory (mesma conexão)
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<PulsarDbContext>));
            if (dbDescriptor is not null)
                services.Remove(dbDescriptor);

            services.AddDbContext<PulsarDbContext>(options =>
                options.UseSqlite(_connection));

            // Remover DataCollectionJob para evitar ciclos em background
            var jobDescriptor = services.SingleOrDefault(
                d => d.ImplementationType == typeof(DataCollectionJob));
            if (jobDescriptor is not null)
                services.Remove(jobDescriptor);

            // Sobrescrever JWT validation para usar secret/issuer/audience de teste.
            // Program.cs captura builder.Configuration em tempo de registro; o
            // PostConfigure garante que os valores de teste prevalecem em runtime.
            const string testSecret =
                "pulsar-chave-secreta-para-testes-unitarios-longa-o-suficiente-32chars";
            services.PostConfigure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.MapInboundClaims = false;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer           = true,
                        ValidateAudience         = true,
                        ValidateLifetime         = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer  = "Pulsar.Tests",
                        ValidAudience = "Pulsar.Tests",
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(testSecret))
                    };
                });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}
