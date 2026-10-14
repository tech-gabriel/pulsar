using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class AdminBootstrapTests
{
    private static IConfiguration Config(params string[] emails)
        => new ConfigurationBuilder().AddInMemoryCollection(
            emails.Select((e, i) => new KeyValuePair<string, string?>($"Admin:Emails:{i}", e))).Build();

    [Theory]
    [InlineData("admin@x.com", true)]
    [InlineData("  ADMIN@X.com ", true)]
    [InlineData("outro@x.com", false)]
    [InlineData("admin@x.coſ", false)]
    public void EhEmailAdmin_ComparaNaFormaCanonica(string email, bool esperado)
        => AdminBootstrap.EhEmailAdmin(Config("Admin@X.com"), email).Should().Be(esperado);

    [Fact]
    public void EhEmailAdmin_ListaVazia_NuncaEhAdmin()
        => AdminBootstrap.EhEmailAdmin(Config(), "admin@x.com").Should().BeFalse();
}
