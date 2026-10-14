using Microsoft.Extensions.Options;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>Confirmação de posse do e-mail (SEC1). Mesmo desenho do reset: token bruto só no link, hash no banco.</summary>
public class EmailVerificacaoService : IEmailVerificacaoService
{
    public const int MaxEnviosPorHora = 3;
    public const int ValidadeHoras = 48;
    private const string LinkInvalido = "Esse link de confirmação expirou ou já foi usado. Peça um novo.";

    private readonly IUsuarioRepository _usuarios;
    private readonly ITokenVerificacaoEmailRepository _tokens;
    private readonly IEmailSender _emailSender;
    private readonly RecuperacaoSenhaOptions _options;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailVerificacaoService> _logger;

    public EmailVerificacaoService(
        IUsuarioRepository usuarios,
        ITokenVerificacaoEmailRepository tokens,
        IEmailSender emailSender,
        IOptions<RecuperacaoSenhaOptions> options,
        IConfiguration configuration,
        ILogger<EmailVerificacaoService> logger)
    {
        _usuarios = usuarios;
        _tokens = tokens;
        _emailSender = emailSender;
        _options = options.Value;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task EnviarConfirmacaoAsync(Usuario usuario, string emailDestino)
    {
        var envios = await _tokens.ContarCriadosDesdeAsync(usuario.Id, DateTime.UtcNow.AddHours(-1));
        if (envios >= MaxEnviosPorHora)
        {
            _logger.LogWarning("Confirmação de e-mail ignorada: usuário {UsuarioId} passou do teto por hora.", usuario.Id);
            return;
        }

        await _tokens.InvalidarPendentesDoUsuarioAsync(usuario.Id);

        var destino = Usuario.NormalizarEmail(emailDestino);
        var bruto = PasswordResetService.GerarTokenBruto();
        await _tokens.AdicionarAsync(new TokenVerificacaoEmail
        {
            UsuarioId = usuario.Id,
            TokenHash = PasswordResetService.CalcularHash(bruto),
            Email = destino,
            ExpiraEm = DateTime.UtcNow.AddHours(ValidadeHoras),
        });
        await _tokens.SalvarAsync();

        var link = $"{_options.UrlBaseFrontend.TrimEnd('/')}/confirmar-email?token={Uri.EscapeDataString(bruto)}";
        await _emailSender.EnviarAsync(destino, "Confirme seu e-mail no Pulsar", MontarEmailHtml(usuario.Nome, link));
    }

    public async Task ConfirmarAsync(string tokenBruto)
    {
        var token = await _tokens.ObterPorTokenHashAsync(PasswordResetService.CalcularHash(tokenBruto ?? string.Empty));
        if (token is null || token.UsadoEm is not null || token.ExpiraEm < DateTime.UtcNow)
            throw new ArgumentException(LinkInvalido);

        var usuario = token.Usuario;
        // Admin:Emails é bootstrap: promove só na primeira verificação da conta. Sem isso, um admin
        // rebaixado com e-mail na lista se repromovia trocando o e-mail e voltando ao da lista.
        var primeiraVerificacao = !usuario.EmailVerificado;
        if (usuario.EmailPendente is not null && token.Email == usuario.EmailPendente)
        {
            // Conferido de novo na hora do clique: outra conta pode ter ficado com o endereço desde o envio.
            var dono = await _usuarios.ObterPorEmailAsync(token.Email);
            if (dono is not null && dono.Id != usuario.Id)
                throw new InvalidOperationException("Esse e-mail passou a ser usado por outra conta.");

            usuario.Email = token.Email;
            usuario.EmailPendente = null;
        }
        else if (token.Email != usuario.Email)
        {
            // O e-mail da conta mudou depois do envio: o link não prova mais nada.
            throw new ArgumentException(LinkInvalido);
        }

        usuario.EmailVerificado = true;
        if (primeiraVerificacao && AdminBootstrap.EhEmailAdmin(_configuration, usuario.Email))
        {
            usuario.Role = RoleAcesso.ADMIN;
            usuario.RenovarCarimbo(); // SEC2: o token novo sai com o papel novo
        }
        token.UsadoEm = DateTime.UtcNow;

        await _tokens.SalvarAsync();
    }

    public async Task ReenviarAsync(Guid usuarioId)
    {
        var usuario = await _usuarios.ObterPorIdAsync(usuarioId);
        if (usuario is null)
            return;

        if (usuario.EmailPendente is not null)
            await EnviarConfirmacaoAsync(usuario, usuario.EmailPendente);
        else if (!usuario.EmailVerificado)
            await EnviarConfirmacaoAsync(usuario, usuario.Email);
    }

    public static string MontarEmailHtml(string nome, string link) => $$"""
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9; font-size: 22px;">Pulsar</h1>
          <p>Olá, {{System.Net.WebUtility.HtmlEncode(nome)}}!</p>
          <p>Falta só confirmar que este e-mail é seu. Assim só você recupera a sua conta.</p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="{{link}}" style="background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Confirmar e-mail</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">O link vale por {{ValidadeHoras}} horas e só pode ser usado uma vez.</p>
          <p style="font-size: 13px; color: #64748b;">Se você não criou uma conta no Pulsar, pode ignorar esta mensagem.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8;">Pulsar · O mapa vivo da sua segurança.</p>
        </div>
        """;
}
