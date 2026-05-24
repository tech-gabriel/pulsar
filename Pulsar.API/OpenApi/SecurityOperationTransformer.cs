using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Pulsar.API.OpenApi;

internal sealed class SecurityOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;

        var hasAuthorize = metadata.OfType<AuthorizeAttribute>().Any();
        var hasAnonymous = metadata.OfType<AllowAnonymousAttribute>().Any();

        if (!hasAuthorize || hasAnonymous)
            return Task.CompletedTask;

        var bearerRef = new OpenApiSecuritySchemeReference("Bearer", context.Document, null!);

        var requirement = new OpenApiSecurityRequirement { [bearerRef] = [] };

        operation.Security ??= [];
        operation.Security.Add(requirement);

        if (operation.Responses is not null)
            operation.Responses.TryAdd("401", new OpenApiResponse { Description = "Token ausente ou inválido." });

        return Task.CompletedTask;
    }
}
