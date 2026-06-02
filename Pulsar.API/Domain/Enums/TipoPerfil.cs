namespace Pulsar.API.Domain.Enums;

/// <summary>
/// Persona do usuário, usada para personalizar a experiência (alertas e
/// sugestões mais relevantes). NÃO concede privilégios — papéis administrativos
/// com autorização real devem ser atribuídos pelo servidor, não auto-selecionados.
/// </summary>
public enum TipoPerfil
{
    CIDADAO,
    MOTORISTA,
    CICLISTA,
    DEFESA_CIVIL
}
