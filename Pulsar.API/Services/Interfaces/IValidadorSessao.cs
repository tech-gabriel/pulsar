namespace Pulsar.API.Services.Interfaces;

public interface IValidadorSessao
{
    /// <summary>A sessão ainda vale: conta existe, está ativa e o carimbo do token é o atual.</summary>
    Task<bool> SessaoValidaAsync(Guid usuarioId, string? carimbo);
}
