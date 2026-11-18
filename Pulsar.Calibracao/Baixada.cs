namespace Pulsar.Calibracao;

/// <summary>Os 9 municípios da Baixada, com a sede copiada do seed (PulsarDbContext, Municipio 33 a 41).</summary>
public static class Baixada
{
    public static readonly SubprefeituraRef[] Todas =
    [
        new("Santos", "Santos", -23.9608, -46.3336),
        new("São Vicente", "São Vicente", -23.9631, -46.3919),
        new("Guarujá", "Guarujá", -23.9931, -46.2564),
        new("Cubatão", "Cubatão", -23.8950, -46.4254),
        new("Praia Grande", "Praia Grande", -24.0058, -46.4028),
        new("Bertioga", "Bertioga", -23.8486, -46.1396),
        new("Mongaguá", "Mongaguá", -24.0931, -46.6208),
        new("Itanhaém", "Itanhaém", -24.1831, -46.7889),
        new("Peruíbe", "Peruíbe", -24.3200, -46.9983),
    ];
}
