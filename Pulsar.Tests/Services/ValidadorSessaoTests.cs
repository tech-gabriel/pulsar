using FluentAssertions;
using Pulsar.API.Domain.Entities;

namespace Pulsar.Tests.Services;

public class ValidadorSessaoTests
{
    [Fact]
    public void RenovarCarimbo_GeraValorNovo()
    {
        var u = new Usuario { Nome = "Ana", Email = "ana@x.com", SenhaHash = "h" };
        var antes = u.CarimboSeguranca;

        u.RenovarCarimbo();

        antes.Should().NotBeNullOrEmpty();
        u.CarimboSeguranca.Should().NotBe(antes).And.HaveLength(32);
    }
}
