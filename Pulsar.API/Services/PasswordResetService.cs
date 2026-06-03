using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly ITokenRecuperacaoSenhaRepository _tokenRepository;
    private readonly IEmailSender _emailSender;
    private readonly RecuperacaoSenhaOptions _options;
    private readonly ILogger<PasswordResetService> _logger;

    public PasswordResetService(
        IUsuarioRepository usuarioRepository,
        ITokenRecuperacaoSenhaRepository tokenRepository,
        IEmailSender emailSender,
        IOptions<RecuperacaoSenhaOptions> options,
        ILogger<PasswordResetService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _tokenRepository = tokenRepository;
        _emailSender = emailSender;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SolicitarResetAsync(EsqueciSenhaRequestDto request)
    {
        var usuario = await _usuarioRepository.ObterPorEmailAsync(request.Email);
        if (usuario is null)
        {
            // Não revela se o e-mail existe — resposta idêntica para qualquer entrada.
            _logger.LogInformation("Recuperação solicitada para e-mail não cadastrado: {Email}", request.Email);
            return;
        }

        // Garante apenas um token ativo por usuário.
        await _tokenRepository.InvalidarPendentesDoUsuarioAsync(usuario.Id);

        var tokenBruto = GerarTokenBruto();
        await _tokenRepository.AdicionarAsync(new TokenRecuperacaoSenha
        {
            UsuarioId = usuario.Id,
            TokenHash = CalcularHash(tokenBruto),
            ExpiraEm = DateTime.UtcNow.AddMinutes(_options.TokenExpiracaoMinutos)
        });
        await _tokenRepository.SalvarAsync();

        var link = MontarLink(tokenBruto);
        var html = MontarEmailHtml(usuario.Nome, link, _options.TokenExpiracaoMinutos);
        await _emailSender.EnviarAsync(usuario.Email, "Recuperação de senha — Pulsar", html);
    }

    public async Task RedefinirSenhaAsync(RedefinirSenhaRequestDto request)
    {
        var token = await _tokenRepository.ObterPorTokenHashAsync(CalcularHash(request.Token));

        if (token is null || token.UsadoEm is not null || token.ExpiraEm < DateTime.UtcNow)
            throw new ArgumentException("Token de recuperação inválido ou expirado. Solicite um novo link.");

        PoliticaSenha.Validar(request.NovaSenha);

        token.Usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.NovaSenha);
        token.UsadoEm = DateTime.UtcNow;

        await _tokenRepository.SalvarAsync();
        _logger.LogInformation("Senha redefinida para o usuário {UsuarioId}.", token.UsuarioId);
    }

    /// <summary>Token aleatório seguro (256 bits) em Base64 URL-safe.</summary>
    private static string GerarTokenBruto()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    /// <summary>Hash SHA-256 (hex) — só o hash é persistido; o token bruto nunca toca o banco.</summary>
    public static string CalcularHash(string tokenBruto)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(tokenBruto)));

    private string MontarLink(string tokenBruto)
    {
        var baseUrl = _options.UrlBaseFrontend.TrimEnd('/');
        var caminho = "/" + _options.CaminhoReset.TrimStart('/');
        return $"{baseUrl}{caminho}?token={Uri.EscapeDataString(tokenBruto)}";
    }

    public static string MontarEmailHtml(string nome, string link, int expiracaoMinutos) => $$"""
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9; font-size: 22px;">Pulsar</h1>
          <p>Olá, {{nome}}!</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="{{link}}" style="background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir senha</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">Este link expira em {{expiracaoMinutos}} minutos e só pode ser usado uma vez.</p>
          <p style="font-size: 13px; color: #64748b;">Se você não solicitou a recuperação, ignore este e-mail — sua senha continua a mesma.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8;">Pulsar — O mapa vivo da sua segurança.</p>
        </div>
        """;
}
