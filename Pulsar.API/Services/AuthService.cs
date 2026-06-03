using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Pulsar.API.Domain.Entities;
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
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha)
        };

        await _usuarioRepository.AdicionarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

        return new LoginResponseDto
        {
            Token = GerarToken(usuario),
            Usuario = MapearUsuarioDto(usuario)
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

        return new LoginResponseDto
        {
            Token = GerarToken(usuario),
            Usuario = MapearUsuarioDto(usuario)
        };
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
        Perfil = usuario.Perfil
    };
}
