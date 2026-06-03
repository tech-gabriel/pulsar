namespace Pulsar.API.Services;

/// <summary>Configuração do fluxo de recuperação de senha (seção "RecuperacaoSenha").</summary>
public class RecuperacaoSenhaOptions
{
    public const string SectionName = "RecuperacaoSenha";

    /// <summary>Validade do token, em minutos (padrão 60).</summary>
    public int TokenExpiracaoMinutos { get; set; } = 60;

    /// <summary>URL base do frontend usada para montar o link de redefinição.</summary>
    public string UrlBaseFrontend { get; set; } = "http://localhost:5173";

    /// <summary>Caminho (rota) da tela de redefinição no frontend.</summary>
    public string CaminhoReset { get; set; } = "/redefinir-senha";
}
