namespace Pulsar.API.Services;

/// <summary>
/// Regras de complexidade de senha, compartilhadas entre cadastro, troca de perfil
/// e recuperação de senha. Lança <see cref="ArgumentException"/> quando a senha é fraca.
/// </summary>
public static class PoliticaSenha
{
    public static void Validar(string senha)
    {
        if (senha.Length < 8)
            throw new ArgumentException("A senha deve ter no mínimo 8 caracteres.");

        if (senha.Count(char.IsDigit) < 2)
            throw new ArgumentException("A senha deve conter ao mínimo 2 números.");

        if (!senha.Any(c => !char.IsLetterOrDigit(c)))
            throw new ArgumentException("A senha deve conter ao mínimo 1 caractere especial.");
    }
}
