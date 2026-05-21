using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Repositories.Data;

public class PulsarDbContext : DbContext
{
    public PulsarDbContext(DbContextOptions<PulsarDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Regiao> Regioes => Set<Regiao>();
    public DbSet<Subprefeitura> Subprefeituras => Set<Subprefeitura>();
    public DbSet<LeituraClimatica> LeiturasClimaticas => Set<LeituraClimatica>();
    public DbSet<ScorePerigo> ScoresPerigo => Set<ScorePerigo>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<Sugestao> Sugestoes => Set<Sugestao>();
    public DbSet<UsuarioRegiao> UsuarioRegioes => Set<UsuarioRegiao>();
    public DbSet<AlertaSugestao> AlertaSugestoes => Set<AlertaSugestao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Nome).IsRequired().HasMaxLength(200);
            e.Property(u => u.Email).IsRequired().HasMaxLength(200);
            e.Property(u => u.SenhaHash).IsRequired();
        });

        modelBuilder.Entity<Regiao>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Nome).IsRequired().HasMaxLength(100);
            e.HasMany(r => r.Subprefeituras)
             .WithOne(s => s.Regiao)
             .HasForeignKey(s => s.RegiaoId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasMany(r => r.Alertas)
             .WithOne(a => a.Regiao)
             .HasForeignKey(a => a.RegiaoId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Subprefeitura>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Nome).IsRequired().HasMaxLength(100);
            e.HasIndex(s => s.RegiaoId);
            e.HasMany(s => s.Leituras)
             .WithOne(l => l.Subprefeitura)
             .HasForeignKey(l => l.SubprefeituraId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(s => s.Scores)
             .WithOne(sc => sc.Subprefeitura)
             .HasForeignKey(sc => sc.SubprefeituraId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeituraClimatica>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => new { l.SubprefeituraId, l.Timestamp });
            e.Property(l => l.Timestamp).IsRequired();
        });

        modelBuilder.Entity<ScorePerigo>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => new { s.SubprefeituraId, s.Timestamp });
            e.HasOne(s => s.Leitura)
             .WithMany()
             .HasForeignKey(s => s.LeituraId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Alerta>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Mensagem).IsRequired().HasMaxLength(500);
            e.HasOne(a => a.Score)
             .WithMany()
             .HasForeignKey(a => a.ScoreId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Sugestao>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Categoria).IsRequired().HasMaxLength(50);
            e.Property(s => s.Titulo).IsRequired().HasMaxLength(200);
            e.Property(s => s.Descricao).IsRequired().HasMaxLength(1000);
            e.HasIndex(s => new { s.Categoria, s.FaixaRisco });
        });

        modelBuilder.Entity<UsuarioRegiao>(e =>
        {
            e.HasKey(ur => ur.Id);
            e.HasIndex(ur => new { ur.UsuarioId, ur.RegiaoId }).IsUnique();
            e.HasOne(ur => ur.Usuario)
             .WithMany(u => u.Favoritos)
             .HasForeignKey(ur => ur.UsuarioId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ur => ur.Regiao)
             .WithMany(r => r.Favoritos)
             .HasForeignKey(ur => ur.RegiaoId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AlertaSugestao>(e =>
        {
            e.HasKey(ase => ase.Id);
            e.HasIndex(ase => new { ase.AlertaId, ase.SugestaoId }).IsUnique();
            e.HasOne(ase => ase.Alerta)
             .WithMany(a => a.AlertaSugestoes)
             .HasForeignKey(ase => ase.AlertaId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ase => ase.Sugestao)
             .WithMany(s => s.AlertaSugestoes)
             .HasForeignKey(ase => ase.SugestaoId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        SeedData(modelBuilder);
    }

    public override int SaveChanges()
    {
        AtualizarTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AtualizarTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void AtualizarTimestamps()
    {
        var agora = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                var criadoEm = entry.Entity.GetType().GetProperty("CriadoEm");
                var atualizadoEm = entry.Entity.GetType().GetProperty("AtualizadoEm");
                criadoEm?.SetValue(entry.Entity, agora);
                atualizadoEm?.SetValue(entry.Entity, agora);
            }
            else if (entry.State == EntityState.Modified)
            {
                var atualizadoEm = entry.Entity.GetType().GetProperty("AtualizadoEm");
                atualizadoEm?.SetValue(entry.Entity, agora);
            }
        }
    }

    private static void SeedData(ModelBuilder modelBuilder) // dados oficiais: GeoPortal SP (centróides dos polígonos WGS-84)
    {
        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // --- Regiões (GeoPortal SP: cd_regiao_05) ---
        var idCentro = new Guid("10000000-0000-0000-0000-000000000001");
        var idLeste  = new Guid("10000000-0000-0000-0000-000000000002");
        var idNorte  = new Guid("10000000-0000-0000-0000-000000000003");
        var idOeste  = new Guid("10000000-0000-0000-0000-000000000004");
        var idSul    = new Guid("10000000-0000-0000-0000-000000000005");

        modelBuilder.Entity<Regiao>().HasData(
            new { Id = idCentro, Nome = "Centro", CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idLeste,  Nome = "Leste",  CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idNorte,  Nome = "Norte",  CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idOeste,  Nome = "Oeste",  CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idSul,    Nome = "Sul",    CriadoEm = seedDate, AtualizadoEm = seedDate }
        );

        // --- Subprefeituras (32) — centróides WGS-84 calculados dos polígonos oficiais ---
        var subprefeituras = new[]
        {
            // Centro (1)
            new { Id = new Guid("20000000-0000-0000-0000-000000000001"), RegiaoId = idCentro, Nome = "Sé",                          Latitude = -23.548360, Longitude = -46.639876, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Leste (12)
            new { Id = new Guid("20000000-0000-0000-0000-000000000002"), RegiaoId = idLeste,  Nome = "Aricanduva-Formosa-Carrão",   Latitude = -23.563778, Longitude = -46.533801, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000003"), RegiaoId = idLeste,  Nome = "Cidade Tiradentes",           Latitude = -23.584802, Longitude = -46.400847, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000004"), RegiaoId = idLeste,  Nome = "Ermelino Matarazzo",          Latitude = -23.501367, Longitude = -46.488332, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000005"), RegiaoId = idLeste,  Nome = "Guaianases",                  Latitude = -23.545071, Longitude = -46.407617, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000006"), RegiaoId = idLeste,  Nome = "Itaim Paulista",              Latitude = -23.506280, Longitude = -46.399181, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000007"), RegiaoId = idLeste,  Nome = "Itaquera",                    Latitude = -23.559879, Longitude = -46.458407, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000008"), RegiaoId = idLeste,  Nome = "Mooca",                       Latitude = -23.548745, Longitude = -46.588138, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000009"), RegiaoId = idLeste,  Nome = "Penha",                       Latitude = -23.521186, Longitude = -46.516174, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000010"), RegiaoId = idLeste,  Nome = "Sapopemba",                   Latitude = -23.605570, Longitude = -46.509548, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000011"), RegiaoId = idLeste,  Nome = "São Mateus",                  Latitude = -23.613550, Longitude = -46.450006, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000012"), RegiaoId = idLeste,  Nome = "São Miguel Paulista",         Latitude = -23.495421, Longitude = -46.437505, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000013"), RegiaoId = idLeste,  Nome = "Vila Prudente",               Latitude = -23.593597, Longitude = -46.558054, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Norte (7)
            new { Id = new Guid("20000000-0000-0000-0000-000000000014"), RegiaoId = idNorte,  Nome = "Casa Verde-Limão-Cachoeirinha", Latitude = -23.476931, Longitude = -46.664169, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000015"), RegiaoId = idNorte,  Nome = "Freguesia-Brasilândia",       Latitude = -23.461469, Longitude = -46.691466, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000016"), RegiaoId = idNorte,  Nome = "Jaçanã-Tremembé",             Latitude = -23.422594, Longitude = -46.587577, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000017"), RegiaoId = idNorte,  Nome = "Perus-Anhanguera",            Latitude = -23.421114, Longitude = -46.773602, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000018"), RegiaoId = idNorte,  Nome = "Pirituba-Jaraguá",            Latitude = -23.465172, Longitude = -46.736836, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000019"), RegiaoId = idNorte,  Nome = "Santana-Tucuruvi",            Latitude = -23.478587, Longitude = -46.627833, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000020"), RegiaoId = idNorte,  Nome = "Vila Maria-Vila Guilherme",   Latitude = -23.504908, Longitude = -46.585228, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Oeste (3)
            new { Id = new Guid("20000000-0000-0000-0000-000000000021"), RegiaoId = idOeste,  Nome = "Butantã",                     Latitude = -23.585714, Longitude = -46.743287, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000022"), RegiaoId = idOeste,  Nome = "Lapa",                        Latitude = -23.528214, Longitude = -46.713954, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000023"), RegiaoId = idOeste,  Nome = "Pinheiros",                   Latitude = -23.573253, Longitude = -46.688826, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Sul (9)
            new { Id = new Guid("20000000-0000-0000-0000-000000000024"), RegiaoId = idSul,    Nome = "Campo Limpo",                 Latitude = -23.645517, Longitude = -46.759994, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000025"), RegiaoId = idSul,    Nome = "Capela do Socorro",           Latitude = -23.766676, Longitude = -46.679802, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000026"), RegiaoId = idSul,    Nome = "Cidade Ademar",               Latitude = -23.693687, Longitude = -46.652667, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000027"), RegiaoId = idSul,    Nome = "Ipiranga",                    Latitude = -23.619492, Longitude = -46.606713, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000028"), RegiaoId = idSul,    Nome = "Jabaquara",                   Latitude = -23.650550, Longitude = -46.645908, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000029"), RegiaoId = idSul,    Nome = "M'Boi Mirim",                 Latitude = -23.701308, Longitude = -46.756119, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000030"), RegiaoId = idSul,    Nome = "Parelheiros",                 Latitude = -23.890827, Longitude = -46.711490, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000031"), RegiaoId = idSul,    Nome = "Santo Amaro",                 Latitude = -23.650098, Longitude = -46.688771, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000032"), RegiaoId = idSul,    Nome = "Vila Mariana",                Latitude = -23.599434, Longitude = -46.646222, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
        };

        modelBuilder.Entity<Subprefeitura>().HasData(subprefeituras);

        // --- Catálogo de Sugestões (5 categorias × 3 faixas × 3 sugestões = 45) ---
        modelBuilder.Entity<Sugestao>().HasData(
            // CHUVA — BAIXO
            new { Id = new Guid("30000000-0000-0000-0000-000000000001"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Chuva leve prevista",             Descricao = "Precipitação leve esperada. Carregue um guarda-chuva ao sair de casa para evitar surpresas.",                                                                     Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000016"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Guarde o guarda-chuva acessível",  Descricao = "Mantenha um guarda-chuva próximo. Chuviscos podem ocorrer sem aviso prévio, especialmente no final da tarde.",                                                      Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000017"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Atenção a bueiros e valetas",      Descricao = "Mesmo com chuva fraca, verifique o estado de bueiros na sua rua e evite caminhar próximo a calçadas alagadas.",                                                     Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // CHUVA — MODERADO
            new { Id = new Guid("30000000-0000-0000-0000-000000000002"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Chuva moderada",               Descricao = "Chuva moderada na região. Evite áreas historicamente alagáveis, reduza a velocidade ao dirigir e mantenha distância segura.",                                       Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000018"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Evite áreas alagáveis",        Descricao = "Verifique o histórico de alagamentos da sua rota antes de sair. Marginais, viadutos e pontos baixos são os primeiros a alagar.",                                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000019"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Reduza a velocidade no trânsito", Descricao = "Pista molhada aumenta a distância de frenagem em até 2x. Reduza a velocidade e mantenha distância segura do veículo à frente.",                                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // CHUVA — ALTO
            new { Id = new Guid("30000000-0000-0000-0000-000000000003"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.ALTO, Titulo = "Chuva intensa — risco de alagamento", Descricao = "Chuva intensa com risco elevado de alagamentos e deslizamentos. Evite viadutos e marginais. Procure abrigo seguro e afaste-se de encostas.",                      Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000020"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.ALTO, Titulo = "Risco de deslizamento",             Descricao = "Em áreas de encosta, saia imediatamente e dirija-se ao abrigo mais próximo. Ligue para a Defesa Civil: 199.",                                                      Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000021"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.ALTO, Titulo = "Nunca atravesse enxurradas",        Descricao = "30 cm de água em movimento podem derrubar um adulto e 60 cm podem arrastar um veículo. Nunca tente atravessar vias alagadas.",                                     Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // VENTO — BAIXO
            new { Id = new Guid("30000000-0000-0000-0000-000000000004"), Categoria = "VENTO", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Vento fraco",                     Descricao = "Ventos fracos. Condições normais de circulação. Nenhuma medida especial necessária.",                                                                               Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000022"), Categoria = "VENTO", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Condições favoráveis ao ar livre", Descricao = "Vento suave. Atividades ao ar livre podem ser realizadas normalmente. Boa condição para caminhadas e esportes externos.",                                              Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000023"), Categoria = "VENTO", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Verifique janelas abertas",        Descricao = "Mesmo com vento fraco, objetos leves podem ser deslocados. Feche janelas e portas ao deixar o ambiente.",                                                            Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // VENTO — MODERADO
            new { Id = new Guid("30000000-0000-0000-0000-000000000005"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Rajadas de vento",             Descricao = "Rajadas moderadas de vento. Atenção a objetos soltos em janelas e sacadas. Motoristas de veículos altos devem redobrar cuidado.",                                 Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000024"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Proteja objetos em sacadas",   Descricao = "Recolha vasos, cadeiras e outros objetos de sacadas e áreas externas. Rajadas podem deslocar itens e causar acidentes.",                                           Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000025"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Cuidado ao abrir portas",      Descricao = "Rajadas de vento podem abrir portas com força inesperada. Segure a maçaneta ao abrir portas externas.",                                                               Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // VENTO — ALTO
            new { Id = new Guid("30000000-0000-0000-0000-000000000006"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Titulo = "Ventos fortes — risco de queda",   Descricao = "Ventos fortes com risco de queda de árvores, placas e estruturas. Evite áreas arborizadas e lugares abertos. Não fique próximo a construções.",                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000026"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Titulo = "Evite ficar sob árvores",           Descricao = "Ventos fortes podem derrubar galhos e árvores inteiras. Mantenha-se longe de árvores, postes e coberturas improvisadas.",                                           Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000027"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Titulo = "Risco para veículos altos",         Descricao = "Caminhões, ônibus e veículos altos têm risco de tombamento. Motoristas devem reduzir velocidade e evitar pistas elevadas.",                                          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // NEBLINA — BAIXO
            new { Id = new Guid("30000000-0000-0000-0000-000000000007"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Visibilidade boa",              Descricao = "Visibilidade dentro dos padrões normais. Condições de trânsito sem restrições por neblina.",                                                                         Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000028"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Sem restrições de visibilidade", Descricao = "Visibilidade adequada para todas as atividades. Continue com as atividades normais com a atenção de sempre.",                                                          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000029"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Neblina matinal pode ocorrer",  Descricao = "Em dias frios e úmidos, neblina leve pode surgir nas primeiras horas da manhã. Fique atento ao sair cedo.",                                                            Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // NEBLINA — MODERADO
            new { Id = new Guid("30000000-0000-0000-0000-000000000008"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Neblina leve",               Descricao = "Neblina reduzindo visibilidade. Ative o farol baixo mesmo de dia, reduza a velocidade e aumente a distância do veículo à frente.",                                Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000030"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Use farol baixo obrigatório", Descricao = "Com neblina, o farol baixo melhora tanto sua visibilidade quanto a percepção dos outros motoristas. Nunca use farol alto — aumenta o ofuscamento.",                 Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000031"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Aumente a distância segura", Descricao = "Com visibilidade reduzida, aumente para pelo menos 4 segundos a distância do veículo à frente. Evite ultrapassagens.",                                               Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // NEBLINA — ALTO
            new { Id = new Guid("30000000-0000-0000-0000-000000000009"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.ALTO, Titulo = "Neblina densa — visibilidade crítica", Descricao = "Neblina densa com visibilidade abaixo de 200m. Evite dirigir se possível. Se necessário, use faróis e pisca-alerta.",                                          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000032"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.ALTO, Titulo = "Pare em local seguro se necessário", Descricao = "Se a visibilidade for inferior a 50m, pare o veículo em local seguro fora da pista e acione o pisca-alerta. Aguarde a neblina dissipar.",                      Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000033"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.ALTO, Titulo = "Pedestres: use roupas claras",   Descricao = "Com neblina densa, pedestres devem usar roupas claras ou refletivas e evitar caminhar em vias com tráfego de veículos.",                                             Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // UV — BAIXO
            new { Id = new Guid("30000000-0000-0000-0000-000000000010"), Categoria = "UV", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Índice UV baixo",                    Descricao = "Índice UV baixo. Proteção solar básica é recomendada, especialmente para pessoas de pele clara.",                                                                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000034"), Categoria = "UV", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Protetor solar FPS 15 suficiente",   Descricao = "Com índice UV baixo, um protetor solar FPS 15 já oferece proteção adequada para a maioria das pessoas em atividades ao ar livre.",                                  Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000035"), Categoria = "UV", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Bom momento para atividades externas", Descricao = "Índice UV favorável para atividades ao ar livre. Aproveite mas lembre-se de se hidratar bem.",                                                                        Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // UV — MODERADO
            new { Id = new Guid("30000000-0000-0000-0000-000000000011"), Categoria = "UV", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Índice UV moderado",              Descricao = "Use protetor solar FPS 30 ou superior. Evite exposição prolongada entre 10h e 16h. Utilize óculos de sol e chapéu.",                                                Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000036"), Categoria = "UV", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Use chapéu e óculos de sol",      Descricao = "Chapéu de aba larga e óculos com proteção UV são essenciais. Reaplicar protetor solar a cada 2 horas ou após suar.",                                                 Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000037"), Categoria = "UV", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Proteja crianças e idosos",       Descricao = "Crianças e idosos são mais sensíveis à radiação UV. Aplique protetor solar antes de sair e evite exposição direta nos horários de pico.",                            Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // UV — ALTO
            new { Id = new Guid("30000000-0000-0000-0000-000000000012"), Categoria = "UV", FaixaRisco = FaixaRisco.ALTO, Titulo = "Índice UV elevado — proteção obrigatória", Descricao = "Índice UV muito alto. Evite exposição ao sol entre 10h e 16h. Use protetor FPS 50+, roupas protetoras e procure a sombra.",                                   Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000038"), Categoria = "UV", FaixaRisco = FaixaRisco.ALTO, Titulo = "Risco de queimaduras em minutos",     Descricao = "Com UV elevado, a pele pode queimar em menos de 15 minutos de exposição sem proteção. Mantenha-se na sombra ou em ambientes internos.",                            Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000039"), Categoria = "UV", FaixaRisco = FaixaRisco.ALTO, Titulo = "Hidratação reforçada",                Descricao = "Além da proteção solar, beba pelo menos 2 litros de água por dia. Calor intenso combinado com UV alto aumenta risco de desidratação e insolação.",               Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // GERAL — BAIXO
            new { Id = new Guid("30000000-0000-0000-0000-000000000013"), Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Condições climáticas favoráveis", Descricao = "Condições climáticas dentro da normalidade. Aproveite o dia com cautela e mantenha-se informado sobre atualizações.",                                                Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000040"), Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Mantenha-se informado",           Descricao = "Mesmo com baixo risco, acompanhe as atualizações do Pulsar a cada 15 minutos. Condições climáticas podem mudar rapidamente.",                                     Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000041"), Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Bom dia para atividades externas", Descricao = "Dia com baixo risco climático. Ótimo para atividades ao ar livre. Leve água e protetor solar como precaução básica.",                                                 Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // GERAL — MODERADO
            new { Id = new Guid("30000000-0000-0000-0000-000000000014"), Categoria = "GERAL", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Atenção às condições climáticas", Descricao = "Condições climáticas requerem atenção. Mantenha-se informado e siga as orientações dos órgãos competentes. Evite exposição desnecessária.",                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000042"), Categoria = "GERAL", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Planeje suas saídas com antecedência", Descricao = "Antes de sair, verifique o score da sua região no Pulsar. Com risco moderado, prefira horários com menor intensidade climática.",                          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000043"), Categoria = "GERAL", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Kit de emergência no carro",   Descricao = "Mantenha no carro: lanternas, cobertor, kit de primeiros socorros, carregador portátil e água. Em situações moderadas, a preparação faz a diferença.",          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // GERAL — ALTO
            new { Id = new Guid("30000000-0000-0000-0000-000000000015"), Categoria = "GERAL", FaixaRisco = FaixaRisco.ALTO, Titulo = "Alerta climático ativo",            Descricao = "Alerta climático ativo na região. Siga as orientações da Defesa Civil, evite áreas de risco e mantenha crianças e idosos em local seguro.",                      Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000044"), Categoria = "GERAL", FaixaRisco = FaixaRisco.ALTO, Titulo = "Ligue para a Defesa Civil",         Descricao = "Em situação de risco, ligue 199 (Defesa Civil) ou 193 (Bombeiros). Não espere a situação piorar para pedir ajuda.",                                               Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000045"), Categoria = "GERAL", FaixaRisco = FaixaRisco.ALTO, Titulo = "Evite deslocamentos desnecessários", Descricao = "Com alerta ativo, fique em local seguro. Se precisar sair, informe alguém sobre seu destino e rota. Prefira rotas conhecidas e seguras.",                          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate }
        );
    }
}
