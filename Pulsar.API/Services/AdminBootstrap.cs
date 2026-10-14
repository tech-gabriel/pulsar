using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Services;

/// <summary>
/// Lista <c>Admin:Emails</c>: quem confirma a posse de um desses e-mails vira ADMIN. A comparação usa a
/// mesma forma canônica do banco (<see cref="Usuario.NormalizarEmail"/>): um segundo jeito de comparar
/// abriria brecha entre "parece igual aqui" e "é diferente lá" (auditoria 2026-10-09).
/// </summary>
public static class AdminBootstrap
{
    public static bool EhEmailAdmin(IConfiguration configuration, string email)
    {
        var emails = configuration.GetSection("Admin:Emails").Get<string[]>();
        var alvo = Usuario.NormalizarEmail(email);
        return emails is not null && emails.Any(e => Usuario.NormalizarEmail(e) == alvo);
    }
}
