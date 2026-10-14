using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class AuthService : IAuthService
{
    /// <summary>Claim do JWT com o carimbo de segurança da conta (SEC2).</summary>
    public const string ClaimCarimbo = "carimbo";

    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IConfiguration _configuration;
    private readonly IEmailVerificacaoService _emailVerificacao;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUsuarioRepository usuarioRepository,
        IConfiguration configuration,
        IEmailVerificacaoService emailVerificacao,
        ILogger<AuthService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _configuration = configuration;
        _emailVerificacao = emailVerificacao;
        _logger = logger;
    }

    public async Task<LoginResponseDto> CadastrarAsync(CadastroRequestDto request)
    {
        if (await _usuarioRepository.EmailExisteAsync(request.Email))
            throw new InvalidOperationException("E-mail já em uso. Tente fazer login.");

        PoliticaSenha.Validar(request.Senha);

        var email = Usuario.NormalizarEmail(request.Email);
        var usuario = new Usuario
        {
            Nome = request.Nome,
            Email = email,
            Perfil = request.Perfil,
            // ADMIN da lista só na confirmação do e-mail (SEC1): cadastrar o e-mail de um admin não prova nada.
            Role = RoleAcesso.USUARIO,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha)
        };

        await _usuarioRepository.AdicionarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

        await EnviarConfirmacaoSemDerrubarAsync(usuario, usuario.Email);

        return new LoginResponseDto
        {
            Token = GerarToken(usuario),
            Usuario = MapearUsuarioDto(usuario),
            NovoUsuario = true
        };
    }

    public async Task<LoginResponseDto> AtualizarPerfilAsync(Guid usuarioId, AtualizarPerfilRequestDto request)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(usuarioId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        // E-mail novo só vale depois do clique no link (SEC1): até lá fica pendente e o atual continua.
        var novoEmail = Usuario.NormalizarEmail(request.Email);
        var trocouEmail = novoEmail != usuario.Email;
        if (trocouEmail)
        {
            var existente = await _usuarioRepository.ObterPorEmailAsync(novoEmail);
            if (existente is not null && existente.Id != usuario.Id)
                throw new InvalidOperationException("E-mail já em uso por outra conta.");
        }

        // Troca de senha (opcional): exige a senha atual correta.
        if (!string.IsNullOrEmpty(request.NovaSenha))
        {
            if (string.IsNullOrEmpty(request.SenhaAtual)
                || !BCrypt.Net.BCrypt.Verify(request.SenhaAtual, usuario.SenhaHash))
                throw new UnauthorizedAccessException("Senha atual incorreta.");

            PoliticaSenha.Validar(request.NovaSenha);
            usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.NovaSenha);
            usuario.RenovarCarimbo(); // SEC2: derruba os outros aparelhos; este recebe o token novo abaixo.
        }

        usuario.Nome = request.Nome;
        usuario.EmailPendente = trocouEmail ? novoEmail : null;
        usuario.Perfil = request.Perfil;

        await _usuarioRepository.AtualizarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

        if (trocouEmail)
            await EnviarConfirmacaoSemDerrubarAsync(usuario, novoEmail);

        return new LoginResponseDto
        {
            Token = GerarToken(usuario),
            Usuario = MapearUsuarioDto(usuario)
        };
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        var usuario = await _usuarioRepository.ObterPorEmailAsync(request.Email);

        if (usuario is null || !BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash))
            throw new UnauthorizedAccessException("E-mail ou senha incorretos.");

        if (!usuario.Ativo)
            throw new UnauthorizedAccessException("Conta desativada. Entre em contato com o suporte.");

        return new LoginResponseDto
        {
            Token = GerarToken(usuario),
            Usuario = MapearUsuarioDto(usuario)
        };
    }

    public async Task<LoginResponseDto> LoginComGoogleAsync(GoogleLoginRequestDto request)
    {
        var clientId = _configuration["Authentication:Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new InvalidOperationException("Login com Google não está configurado.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                request.IdToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } });
        }
        catch (InvalidJwtException)
        {
            throw new UnauthorizedAccessException("Não foi possível validar o login com o Google.");
        }

        if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email))
            throw new UnauthorizedAccessException("E-mail do Google não verificado.");

        return await EntrarComEmailGoogleAsync(payload.Email, payload.Name);
    }

    /// <summary>
    /// Parte do login Google que vem depois de validar o token: o Google atestou a posse de <paramref name="email"/>.
    /// Pública para teste (o token do Google não se fabrica em teste).
    /// </summary>
    public async Task<LoginResponseDto> EntrarComEmailGoogleAsync(string email, string? nome)
    {
        var usuario = await _usuarioRepository.ObterPorEmailAsync(email);
        // Guardado antes do bloco: adiante `usuario` deixa de ser nulo e a informação se perde.
        var novoUsuario = usuario is null;

        if (usuario is null)
        {
            // Cadastro implícito via Google: conta sem senha utilizável, já verificada.
            usuario = new Usuario
            {
                Nome = string.IsNullOrWhiteSpace(nome) ? email : nome,
                Email = Usuario.NormalizarEmail(email),
                Perfil = TipoPerfil.CIDADAO,
                Role = AdminBootstrap.EhEmailAdmin(_configuration, email) ? RoleAcesso.ADMIN : RoleAcesso.USUARIO,
                EmailVerificado = true,
                // Sem login por senha: hash aleatório e inutilizável (não corresponde a nenhuma senha).
                SenhaHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"))
            };
            await _usuarioRepository.AdicionarAsync(usuario);
            await _usuarioRepository.SalvarAsync();
        }
        else
        {
            if (!usuario.Ativo)
                throw new UnauthorizedAccessException("Conta desativada. Entre em contato com o suporte.");

            if (!usuario.EmailVerificado)
            {
                // Quem cadastrou com senha nunca provou o e-mail; quem entra pelo Google provou.
                // A conta fica com quem provou: a senha antiga deixa de valer (pré-sequestro, SEC1).
                usuario.EmailVerificado = true;
                usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
                usuario.EmailPendente = null;
                usuario.RenovarCarimbo(); // SEC2: as sessões de quem cadastrou com senha caem junto
                if (AdminBootstrap.EhEmailAdmin(_configuration, usuario.Email))
                    usuario.Role = RoleAcesso.ADMIN;
                await _usuarioRepository.AtualizarAsync(usuario);
                await _usuarioRepository.SalvarAsync();
            }
        }

        return new LoginResponseDto
        {
            Token = GerarToken(usuario),
            Usuario = MapearUsuarioDto(usuario),
            NovoUsuario = novoUsuario
        };
    }

    public async Task SairDeTodosAsync(Guid usuarioId)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(usuarioId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");
        usuario.RenovarCarimbo();
        usuario.EmailPendente = null; // o link de troca de e-mail deixado por um invasor deixa de valer
        await _usuarioRepository.AtualizarAsync(usuario);
        await _usuarioRepository.SalvarAsync();
    }

    public async Task<UsuarioDto> ObterUsuarioAsync(Guid usuarioId)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(usuarioId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");
        return MapearUsuarioDto(usuario);
    }

    /// <summary>Falha no envio (Resend fora do ar) não derruba cadastro nem perfil: a pessoa usa "Reenviar".</summary>
    private async Task EnviarConfirmacaoSemDerrubarAsync(Usuario usuario, string emailDestino)
    {
        try
        {
            await _emailVerificacao.EnviarConfirmacaoAsync(usuario, emailDestino);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao enviar a confirmação de e-mail do usuário {UsuarioId}.", usuario.Id);
        }
    }

    private string GerarToken(Usuario usuario)
    {
        var secretKey = _configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey não configurada.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiration = int.Parse(_configuration["Jwt:ExpirationHours"] ?? "24");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
            new Claim(JwtRegisteredClaimNames.Name, usuario.Nome),
            new Claim("perfil", usuario.Perfil.ToString()),
            new Claim(ClaimTypes.Role, usuario.Role.ToString()),
            new Claim(ClaimCarimbo, usuario.CarimboSeguranca),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiration),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UsuarioDto MapearUsuarioDto(Usuario usuario) => new()
    {
        Id = usuario.Id,
        Nome = usuario.Nome,
        Email = usuario.Email,
        Perfil = usuario.Perfil,
        Role = usuario.Role,
        EmailVerificado = usuario.EmailVerificado,
        EmailPendente = usuario.EmailPendente
    };
}
