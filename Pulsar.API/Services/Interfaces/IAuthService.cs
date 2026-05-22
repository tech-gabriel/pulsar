using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> CadastrarAsync(CadastroRequestDto request);
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
}
