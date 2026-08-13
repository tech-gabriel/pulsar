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
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IConfiguration _configuration;

    public AuthService(IUsuarioRepository usuarioRepository, IConfiguration configuration)
    {
        _usuarioRepository = usuarioRepository;
        _configuration = configuration;
    }

    public async Task<LoginResponseDto> CadastrarAsync(CadastroRequestDto request)
    {
        if (await _usuarioRepository.EmailExisteAsync(request.Email))
            throw new InvalidOperationException("E-mail já em uso. Tente fazer login.");

        PoliticaSenha.Validar(request.Senha);

        var usuario = new Usuario
        {
            Nome = request.Nome,
            Email = request.Email,
            Perfil = request.Perfil,
            // Bootstrap: e-mails listados em Admin:Emails nascem como ADMIN.
            Role = EhEmailAdmin(request.Email) ? RoleAcesso.ADMIN : RoleAcesso.USUARIO,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha)
        };

        await _usuarioRepository.AdicionarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

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

        // E-mail novo não pode pertencer a outro usuário.
        if (!string.Equals(usuario.Email, request.Email, StringComparison.OrdinalIgnoreCase))
        {
            var existente = await _usuarioRepository.ObterPorEmailAsync(request.Email);
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
        }

        usuario.Nome = request.Nome;
        usuario.Email = request.Email;
        usuario.Perfil = request.Perfil;

        await _usuarioRepository.AtualizarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

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

        // Auto-heal do bootstrap: se o e-mail está na lista de admins mas a conta
        // ainda não é ADMIN (ex.: criada antes da configuração), promove agora.
        if (EhEmailAdmin(usuario.Email) && usuario.Role != RoleAcesso.ADMIN)
        {
            usuario.Role = RoleAcesso.ADMIN;
            await _usuarioRepository.AtualizarAsync(usuario);
            await _usuarioRepository.SalvarAsync();
        }

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

        var usuario = await _usuarioRepository.ObterPorEmailAsync(payload.Email);
        // Guardado antes do bloco: adiante `usuario` deixa de ser nulo e a informação se perde.
        var novoUsuario = usuario is null;

        if (usuario is null)
        {
            // Cadastro implícito via Google: conta sem senha utilizável.
            usuario = new Usuario
            {
                Nome = string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
                Email = payload.Email,
                Perfil = TipoPerfil.CIDADAO,
                Role = EhEmailAdmin(payload.Email) ? RoleAcesso.ADMIN : RoleAcesso.USUARIO,
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

            // Auto-heal do bootstrap de admin (mesma regra do login por senha).
            if (EhEmailAdmin(usuario.Email) && usuario.Role != RoleAcesso.ADMIN)
            {
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

    /// <summary>
    /// Indica se o e-mail consta na lista <c>Admin:Emails</c> da configuração
    /// (comparação case-insensitive). Usado para o bootstrap do primeiro admin.
    /// </summary>
    private bool EhEmailAdmin(string email)
    {
        var emails = _configuration.GetSection("Admin:Emails").Get<string[]>();
        return emails is not null
            && emails.Any(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase));
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
        Role = usuario.Role
    };
}
