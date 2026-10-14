using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Services.Interfaces;

public interface IEmailVerificacaoService
{
    /// <summary>Envia o link que confirma <paramref name="emailDestino"/> (o atual ou o pendente). Respeita o teto por hora.</summary>
    Task EnviarConfirmacaoAsync(Usuario usuario, string emailDestino);

    /// <summary>Consome o link. <see cref="ArgumentException"/>: link inválido; <see cref="InvalidOperationException"/>: e-mail já tomado.</summary>
    Task ConfirmarAsync(string tokenBruto);

    /// <summary>Reenvia para o e-mail pendente, ou para o atual se ainda não verificado. Sem nada a confirmar, não faz nada.</summary>
    Task ReenviarAsync(Guid usuarioId);
}
