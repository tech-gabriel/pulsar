namespace Pulsar.API.Services;

/// <summary>
/// Conversão de instante UTC para o calendário local de um fuso.
///
/// SÓ existe a direção UTC -> local, de propósito. O caminho inverso não é seguro:
/// em zona cujo horário de verão vira à meia-noite, a meia-noite local não existe
/// naquele dia e a conversão lança. Era assim o horário de verão brasileiro antes
/// de 2019. Se você precisa de "início do dia local em UTC", NÃO adicione o método:
/// busque uma janela em UTC (mais folgada que o dia) e filtre convertendo cada
/// instante para local com <see cref="DiaLocal"/>. Vale para qualquer pergunta do
/// tipo "o que aconteceu hoje/nesta hora local": o filtro é por instante convertido,
/// nunca por fronteira local traduzida para UTC.
/// </summary>
public static class FusoLocal
{
    /// <summary>
    /// Instante UTC lido no relógio de parede do fuso.
    ///
    /// O <c>Kind</c> é normalizado para <see cref="DateTimeKind.Utc"/> porque o argumento
    /// já é um instante UTC por contrato, mas nem sempre chega marcado como tal: o Postgres
    /// devolve <c>Unspecified</c> em algumas configurações. <c>Unspecified</c> o
    /// <c>ConvertTimeFromUtc</c> aceita (trata como UTC), mas <c>Local</c> ele rejeita com
    /// <see cref="ArgumentException"/>, e é por causa desse caso que a normalização existe.
    /// O retorno é hora de parede do fuso pedido (<c>Kind</c> <c>Unspecified</c>), e não
    /// horário da máquina: não passar adiante como se fosse UTC.
    /// </summary>
    public static DateTime ConverterParaLocal(DateTime instanteUtc, TimeZoneInfo tz)
        => TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(instanteUtc, DateTimeKind.Utc), tz);

    /// <summary>Dia do calendário em que o instante cai no fuso pedido.</summary>
    public static DateOnly DiaLocal(DateTime instanteUtc, TimeZoneInfo tz)
        => DateOnly.FromDateTime(ConverterParaLocal(instanteUtc, tz));

    /// <summary>Hora do relógio local (0 a 23) em que o instante cai no fuso pedido.</summary>
    public static int HoraLocal(DateTime instanteUtc, TimeZoneInfo tz)
        => ConverterParaLocal(instanteUtc, tz).Hour;
}
