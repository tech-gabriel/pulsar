namespace Pulsar.API.Services.Push;

/// <summary>
/// Configuração do Web Push (seção "Push"). As chaves VAPID identificam o
/// servidor perante os serviços de push dos navegadores. A chave privada deve
/// ficar em User Secrets / variável de ambiente — NUNCA em appsettings versionado.
/// Sem PublicKey/PrivateKey o push fica desativado (gated por config, como o login Google).
/// </summary>
public class PushOptions
{
    public const string SectionName = "Push";

    /// <summary>Chave pública VAPID (Base64 URL-safe). Exposta ao frontend para a inscrição.</summary>
    public string PublicKey { get; set; } = string.Empty;

    /// <summary>Chave privada VAPID. Só em User Secrets / env var.</summary>
    public string PrivateKey { get; set; } = string.Empty;

    /// <summary>Identificação de contato do remetente (mailto: ou URL), exigida pelo VAPID.</summary>
    public string Subject { get; set; } = "mailto:contato@pulsar.app";
}
