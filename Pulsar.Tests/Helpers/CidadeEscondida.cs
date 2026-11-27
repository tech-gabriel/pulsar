using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Helpers;

/// <summary>
/// A Baixada já é pública no seed. Os testes da regra "cidade com Publica = false some para a conta comum"
/// escondem a Baixada no banco do teste, e a regra segue coberta para a próxima cidade.
/// </summary>
public static class CidadeEscondida
{
    public static void EsconderBaixada(PulsarWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        db.Cidades.Single(c => c.Nome == "Baixada Santista").Publica = false;
        db.SaveChanges();
    }
}
