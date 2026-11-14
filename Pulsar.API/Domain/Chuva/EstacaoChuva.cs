using Pulsar.API.Services;

namespace Pulsar.API.Domain.Chuva;

/// <summary>
/// Chuva medida por uma estação com endereço, nas janelas que o score usa. Só existe para
/// leitura plausível: quem recebe uma <see cref="EstacaoChuva"/> não precisa desconfiar dela.
/// </summary>
/// <param name="Mm48h">Null quando a estação não mandou as 48 h; a saturação usa então o modelo.</param>
public record EstacaoChuva(string Cod, double Lat, double Lon, double Mm1h, double Mm3h, double? Mm48h)
{
    /// <summary>Acima disto em uma hora é defeito do pluviômetro, não chuva (o recorde brasileiro fica perto).</summary>
    public const double Maximo1hMm = 150;

    /// <summary>Arredondamento do CEMADEN: uma janela maior pode vir um pouco abaixo da menor.</summary>
    private const double FolgaMm = 0.5;

    /// <summary>
    /// Null quando a leitura não serve para a conta: sem 1 h ou 3 h, negativa, acima do
    /// possível, ou com 1 h maior que 3 h. Estação que manda lixo passaria a mexer no risco.
    /// </summary>
    public static EstacaoChuva? Criar(string cod, double lat, double lon, double? acc1h, double? acc3h, double? acc48h)
    {
        if (acc1h is not { } mm1h || acc3h is not { } mm3h) return null;
        if (mm1h < 0 || mm1h > Maximo1hMm || mm3h < mm1h - FolgaMm) return null;
        return new EstacaoChuva(cod, lat, lon, mm1h, mm3h, acc48h >= mm3h - FolgaMm ? acc48h : null);
    }

    /// <summary>A estação mais perto do ponto, até <paramref name="raioKm"/>. Null = nenhuma por perto.</summary>
    public static EstacaoChuva? MaisProxima(double lat, double lon, IReadOnlyList<EstacaoChuva> estacoes, double raioKm)
    {
        EstacaoChuva? melhor = null;
        var menor = raioKm * 1000;
        foreach (var e in estacoes)
        {
            var metros = GeoDistancia.HaversineMetros(lat, lon, e.Lat, e.Lon);
            if (metros <= menor) (melhor, menor) = (e, metros);
        }
        return melhor;
    }
}
