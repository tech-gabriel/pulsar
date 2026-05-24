using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Pulsar.API.OpenApi;

internal sealed class PulsarDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Info = new OpenApiInfo
        {
            Title = "Pulsar API",
            Version = "v1",
            Description = """
                API REST do **Pulsar** — monitoramento climático em tempo real para São Paulo.

                Coleta dados de 32 subprefeituras, calcula o Score de Perigo (0-100) e expõe mapas de risco com alertas.

                ## Autenticação
                Todas as rotas (exceto `/api/auth/cadastro` e `/api/auth/login`) requerem token **JWT Bearer**.

                1. Faça `POST /api/auth/login` para obter o token.
                2. Inclua o header `Authorization: Bearer {token}` nas demais requisições.
                """,
            Contact = new OpenApiContact
            {
                Name = "Equipe Pulsar",
                Email = "tech.gabrielleite@gmail.com"
            }
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Token JWT obtido via `POST /api/auth/login`. Inclua no header: `Authorization: Bearer {token}`"
        };

        return Task.CompletedTask;
    }
}
