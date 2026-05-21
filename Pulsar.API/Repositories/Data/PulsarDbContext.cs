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

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // --- Regiões ---
        var idCentro = new Guid("10000000-0000-0000-0000-000000000001");
        var idNorte  = new Guid("10000000-0000-0000-0000-000000000002");
        var idSul    = new Guid("10000000-0000-0000-0000-000000000003");
        var idLeste  = new Guid("10000000-0000-0000-0000-000000000004");
        var idOeste  = new Guid("10000000-0000-0000-0000-000000000005");

        modelBuilder.Entity<Regiao>().HasData(
            new { Id = idCentro, Nome = "Centro",  CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idNorte,  Nome = "Norte",   CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idSul,    Nome = "Sul",     CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idLeste,  Nome = "Leste",   CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idOeste,  Nome = "Oeste",   CriadoEm = seedDate, AtualizadoEm = seedDate }
        );

        // --- Subprefeituras (32) ---
        var subprefeituras = new[]
        {
            // Centro (6)
            new { Id = new Guid("20000000-0000-0000-0000-000000000001"), RegiaoId = idCentro, Nome = "Sé",             Latitude = -23.5505, Longitude = -46.6333, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000002"), RegiaoId = idCentro, Nome = "Mooca",          Latitude = -23.5561, Longitude = -46.6019, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000003"), RegiaoId = idCentro, Nome = "Lapa",           Latitude = -23.5260, Longitude = -46.7084, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000004"), RegiaoId = idCentro, Nome = "Pinheiros",      Latitude = -23.5663, Longitude = -46.6929, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000005"), RegiaoId = idCentro, Nome = "Vila Mariana",   Latitude = -23.5874, Longitude = -46.6355, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000006"), RegiaoId = idCentro, Nome = "Butantã",        Latitude = -23.5674, Longitude = -46.7371, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Norte (6)
            new { Id = new Guid("20000000-0000-0000-0000-000000000007"), RegiaoId = idNorte,  Nome = "Santana/Tucuruvi",           Latitude = -23.5003, Longitude = -46.6258, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000008"), RegiaoId = idNorte,  Nome = "Casa Verde/Cachoeirinha",     Latitude = -23.4986, Longitude = -46.6578, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000009"), RegiaoId = idNorte,  Nome = "Freguesia do Ó/Brasilândia", Latitude = -23.4673, Longitude = -46.6880, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000010"), RegiaoId = idNorte,  Nome = "Pirituba/Jaraguá",           Latitude = -23.4726, Longitude = -46.7541, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000011"), RegiaoId = idNorte,  Nome = "Perus",                      Latitude = -23.4031, Longitude = -46.7621, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000012"), RegiaoId = idNorte,  Nome = "Tremembé/Jacanã",            Latitude = -23.4612, Longitude = -46.5959, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Sul (6)
            new { Id = new Guid("20000000-0000-0000-0000-000000000013"), RegiaoId = idSul,    Nome = "Santo Amaro",       Latitude = -23.6510, Longitude = -46.7073, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000014"), RegiaoId = idSul,    Nome = "Campo Limpo",        Latitude = -23.6267, Longitude = -46.7674, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000015"), RegiaoId = idSul,    Nome = "Capela do Socorro",  Latitude = -23.7069, Longitude = -46.6875, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000016"), RegiaoId = idSul,    Nome = "Cidade Ademar",      Latitude = -23.6597, Longitude = -46.6449, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000017"), RegiaoId = idSul,    Nome = "M'Boi Mirim",        Latitude = -23.7093, Longitude = -46.7451, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000018"), RegiaoId = idSul,    Nome = "Parelheiros",        Latitude = -23.8246, Longitude = -46.7296, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Leste (11)
            new { Id = new Guid("20000000-0000-0000-0000-000000000019"), RegiaoId = idLeste,  Nome = "Aricanduva/Formosa/Carrão", Latitude = -23.5381, Longitude = -46.5354, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000020"), RegiaoId = idLeste,  Nome = "Cidade Tiradentes",         Latitude = -23.6082, Longitude = -46.4260, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000021"), RegiaoId = idLeste,  Nome = "Ermelino Matarazzo",        Latitude = -23.5060, Longitude = -46.4688, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000022"), RegiaoId = idLeste,  Nome = "Guaianases",                Latitude = -23.5640, Longitude = -46.4113, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000023"), RegiaoId = idLeste,  Nome = "Itaim Paulista",            Latitude = -23.5147, Longitude = -46.4057, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000024"), RegiaoId = idLeste,  Nome = "Itaquera",                  Latitude = -23.5376, Longitude = -46.4570, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000025"), RegiaoId = idLeste,  Nome = "Penha",                     Latitude = -23.5224, Longitude = -46.5310, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000026"), RegiaoId = idLeste,  Nome = "São Mateus",                Latitude = -23.6182, Longitude = -46.4873, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000027"), RegiaoId = idLeste,  Nome = "São Miguel Paulista",       Latitude = -23.5115, Longitude = -46.4451, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000028"), RegiaoId = idLeste,  Nome = "Sapopemba",                 Latitude = -23.5918, Longitude = -46.4881, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000029"), RegiaoId = idLeste,  Nome = "Vila Prudente",             Latitude = -23.5863, Longitude = -46.5670, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // Oeste (3)
            new { Id = new Guid("20000000-0000-0000-0000-000000000030"), RegiaoId = idOeste,  Nome = "Ipiranga",                  Latitude = -23.5868, Longitude = -46.6083, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000031"), RegiaoId = idOeste,  Nome = "Jabaquara",                 Latitude = -23.6554, Longitude = -46.6432, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("20000000-0000-0000-0000-000000000032"), RegiaoId = idOeste,  Nome = "Vila Maria/Vila Guilherme", Latitude = -23.5138, Longitude = -46.5938, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
        };

        modelBuilder.Entity<Subprefeitura>().HasData(subprefeituras);

        // --- Catálogo de Sugestões (5 categorias × 3 faixas = 15) ---
        modelBuilder.Entity<Sugestao>().HasData(
            // CHUVA
            new { Id = new Guid("30000000-0000-0000-0000-000000000001"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.BAIXO,    Titulo = "Chuva leve prevista",   Descricao = "Precipitação leve esperada. Carregue um guarda-chuva ao sair de casa para evitar surpresas.",                                                               Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000002"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Chuva moderada",        Descricao = "Chuva moderada na região. Evite áreas historicamente alagáveis, reduza a velocidade ao dirigir e mantenha distância segura.",                          Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000003"), Categoria = "CHUVA", FaixaRisco = FaixaRisco.ALTO,     Titulo = "Chuva intensa — risco de alagamento", Descricao = "Chuva intensa com risco elevado de alagamentos e deslizamentos. Evite viadutos e marginais. Procure abrigo seguro e afaste-se de encostas.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // VENTO
            new { Id = new Guid("30000000-0000-0000-0000-000000000004"), Categoria = "VENTO", FaixaRisco = FaixaRisco.BAIXO,    Titulo = "Vento fraco",           Descricao = "Ventos fracos. Condições normais de circulação. Nenhuma medida especial necessária.",                                                                       Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000005"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Rajadas de vento",      Descricao = "Rajadas moderadas de vento. Atenção a objetos soltos em janelas e sacadas. Motoristas de veículos altos devem redobrar cuidado.",                        Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000006"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO,     Titulo = "Ventos fortes — risco de queda", Descricao = "Ventos fortes com risco de queda de árvores, placas e estruturas. Evite áreas arborizadas e lugares abertos. Não fique próximo a construções.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // NEBLINA
            new { Id = new Guid("30000000-0000-0000-0000-000000000007"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.BAIXO,    Titulo = "Visibilidade boa",     Descricao = "Visibilidade dentro dos padrões normais. Condições de trânsito sem restrições por neblina.",                                                             Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000008"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Neblina leve",         Descricao = "Neblina reduzindo visibilidade. Ative o farol baixo mesmo de dia, reduza a velocidade e aumente a distância do veículo à frente.",                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000009"), Categoria = "NEBLINA", FaixaRisco = FaixaRisco.ALTO,     Titulo = "Neblina densa — visibilidade crítica", Descricao = "Neblina densa com visibilidade abaixo de 200m. Evite dirigir se possível. Se necessário, use faróis e pisca-alerta.",                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // UV
            new { Id = new Guid("30000000-0000-0000-0000-000000000010"), Categoria = "UV", FaixaRisco = FaixaRisco.BAIXO,    Titulo = "Índice UV baixo",             Descricao = "Índice UV baixo. Proteção solar básica é recomendada, especialmente para pessoas de pele clara.",                                                    Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000011"), Categoria = "UV", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Índice UV moderado",          Descricao = "Use protetor solar FPS 30 ou superior. Evite exposição prolongada entre 10h e 16h. Utilize óculos de sol e chapéu.",                                Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000012"), Categoria = "UV", FaixaRisco = FaixaRisco.ALTO,     Titulo = "Índice UV elevado — proteção obrigatória", Descricao = "Índice UV muito alto. Evite exposição ao sol entre 10h e 16h. Use protetor FPS 50+, roupas protetoras e procure a sombra.",             Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            // GERAL
            new { Id = new Guid("30000000-0000-0000-0000-000000000013"), Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO,    Titulo = "Condições climáticas favoráveis", Descricao = "Condições climáticas dentro da normalidade. Aproveite o dia com cautela e mantenha-se informado sobre atualizações.",                      Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000014"), Categoria = "GERAL", FaixaRisco = FaixaRisco.MODERADO, Titulo = "Atenção às condições climáticas", Descricao = "Condições climáticas requerem atenção. Mantenha-se informado e siga as orientações dos órgãos competentes. Evite exposição desnecessária.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000015"), Categoria = "GERAL", FaixaRisco = FaixaRisco.ALTO,     Titulo = "Alerta climático ativo",        Descricao = "Alerta climático ativo na região. Siga as orientações da Defesa Civil, evite áreas de risco e mantenha crianças e idosos em local seguro.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate }
        );
    }
}
