namespace Pulsar.Calibracao;

public record SubprefeituraRef(string Nome, string Sigla, double Lat, double Lon);

/// <summary>Coordenadas do seed (PulsarDbContext) e siglas do GeoSampa (nm_subprefeitura).</summary>
public static class Subprefeituras
{
    public static readonly SubprefeituraRef[] Todas =
    [
        new("Sé", "SE", -23.548360, -46.639876),
        new("Aricanduva-Formosa-Carrão", "AF", -23.563778, -46.533801),
        new("Cidade Tiradentes", "CT", -23.584802, -46.400847),
        new("Ermelino Matarazzo", "EM", -23.501367, -46.488332),
        new("Guaianases", "G", -23.545071, -46.407617),
        new("Itaim Paulista", "IT", -23.506280, -46.399181),
        new("Itaquera", "IQ", -23.559879, -46.458407),
        new("Mooca", "MO", -23.548745, -46.588138),
        new("Penha", "PE", -23.521186, -46.516174),
        new("Sapopemba", "SB", -23.605570, -46.509548),
        new("São Mateus", "SM", -23.613550, -46.450006),
        new("São Miguel", "MP", -23.495421, -46.437505),
        new("Vila Prudente", "VP", -23.593597, -46.558054),
        new("Casa Verde-Limão-Cachoeirinha", "CV", -23.476931, -46.664169),
        new("Freguesia-Brasilândia", "FO", -23.461469, -46.691466),
        new("Jaçanã-Tremembé", "JT", -23.422594, -46.587577),
        new("Perus-Anhanguera", "PR", -23.421114, -46.773602),
        new("Pirituba-Jaraguá", "PJ", -23.465172, -46.736836),
        new("Santana-Tucuruvi", "ST", -23.478587, -46.627833),
        new("Vila Maria-Vila Guilherme", "MG", -23.504908, -46.585228),
        new("Butantã", "BT", -23.585714, -46.743287),
        new("Lapa", "LA", -23.528214, -46.713954),
        new("Pinheiros", "PI", -23.573253, -46.688826),
        new("Campo Limpo", "CL", -23.645517, -46.759994),
        new("Capela do Socorro", "CS", -23.766676, -46.679802),
        new("Cidade Ademar", "AD", -23.693687, -46.652667),
        new("Ipiranga", "IP", -23.619492, -46.606713),
        new("Jabaquara", "JA", -23.650550, -46.645908),
        new("M'Boi Mirim", "MB", -23.701308, -46.756119),
        new("Parelheiros", "PA", -23.890827, -46.711490),
        new("Santo Amaro", "SA", -23.650098, -46.688771),
        new("Vila Mariana", "VM", -23.599434, -46.646222),
    ];
}
