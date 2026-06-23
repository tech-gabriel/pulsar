using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> CadastrarAsync(CadastroRequestDto request);
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
    Task<LoginResponseDto> LoginComGoogleAsync(GoogleLoginRequestDto request);
    Task<LoginResponseDto> AtualizarPerfilAsync(Guid usuarioId, AtualizarPerfilRequestDto request);
}
