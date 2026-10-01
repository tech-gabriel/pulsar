using System.Globalization;
using System.Text.Json;

namespace Pulsar.Calibracao;

public record HoraClima(DateTime HoraLocal, double ChuvaMm, double VentoKmH, double SensacaoC, double Uv, double VisibilidadeKm);

/// <summary>
/// Histórico horário do Open-Meteo Historical Forecast API (dados desde 2022, CC BY 4.0).
/// Uso offline de pesquisa para calibração: não é dependência de produção.
/// </summary>
public static class FonteOpenMeteo
{
    private const string Base = "https://historical-forecast-api.open-meteo.com/v1/forecast";

    public static async Task<List<HoraClima>> SerieAsync(HttpClient http, SubprefeituraRef s, DateOnly de, DateOnly ate, string dirCache)
    {
        var arq = Path.Combine(dirCache, $"openmeteo-{s.Sigla}-{de:yyyyMMdd}-{ate:yyyyMMdd}.json");
        string json;
        if (File.Exists(arq)) json = await File.ReadAllTextAsync(arq);
        else
        {
            var url = string.Create(CultureInfo.InvariantCulture,
                $"{Base}?latitude={s.Lat}&longitude={s.Lon}&start_date={de:yyyy-MM-dd}&end_date={ate:yyyy-MM-dd}&hourly=precipitation,wind_speed_10m,apparent_temperature,uv_index,visibility&wind_speed_unit=kmh&timezone=America%2FSao_Paulo");
            json = await http.GetStringAsync(url);
            Directory.CreateDirectory(dirCache);
            await File.WriteAllTextAsync(arq, json);
            await Task.Delay(300); // educado com a API grátis
        }

        using var doc = JsonDocument.Parse(json);
        var h = doc.RootElement.GetProperty("hourly");
        var tempos = h.GetProperty("time");
        double Ler(string nome, int i)
        {
            var v = h.GetProperty(nome)[i];
            return v.ValueKind == JsonValueKind.Number ? v.GetDouble() : 0;
        }

        var serie = new List<HoraClima>(tempos.GetArrayLength());
        for (var i = 0; i < tempos.GetArrayLength(); i++)
        {
            serie.Add(new HoraClima(
                DateTime.Parse(tempos[i].GetString()!, CultureInfo.InvariantCulture),
                Ler("precipitation", i),
                Ler("wind_speed_10m", i),
                Ler("apparent_temperature", i),
                Ler("uv_index", i),
                Ler("visibility", i) / 1000.0)); // metros -> km
        }
        return serie;
    }
}
