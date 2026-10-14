using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Pulsar.API.DTOs;

namespace Pulsar.Tests.Helpers;

/// <summary>
/// Sessão do admin de bootstrap. Desde o SEC1 o ADMIN só vem com a confirmação do e-mail:
/// cadastra (se ainda não existe), confirma pelo link capturado e entra de novo para o token sair com a role.
/// </summary>
public static class SessaoAdmin
{
    public const string Senha = "Admin@123";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task<LoginResponseDto> ObterAsync(PulsarWebApplicationFactory factory, HttpClient client)
    {
        const string email = PulsarWebApplicationFactory.EmailAdminBootstrap;
        var cadastro = await client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Admin", Email = email, Senha = Senha });
        if (cadastro.IsSuccessStatusCode)
        {
            var confirmacao = await client.PostAsJsonAsync("/api/auth/confirmar-email",
                new ConfirmarEmailRequestDto { Token = factory.Emails.UltimoTokenPara(email) });
            confirmacao.EnsureSuccessStatusCode();
        }

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto { Email = email, Senha = Senha });
        login.EnsureSuccessStatusCode();
        return (await login.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }
}
