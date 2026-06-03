using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IPasswordResetService
{
    /// <summary>
    /// Gera um token de recuperação e envia o link por e-mail. Por segurança, é
    /// silencioso quando o e-mail não existe (não revela cadastro).
    /// </summary>
    Task SolicitarResetAsync(EsqueciSenhaRequestDto request);

    /// <summary>Valida o token e redefine a senha. Lança ArgumentException se inválido/expirado.</summary>
    Task RedefinirSenhaAsync(RedefinirSenhaRequestDto request);
}
