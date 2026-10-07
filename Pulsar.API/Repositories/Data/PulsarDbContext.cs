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
    public DbSet<AgregadoDiario> AgregadosDiarios => Set<AgregadoDiario>();
    public DbSet<Sugestao> Sugestoes => Set<Sugestao>();
    public DbSet<UsuarioSubprefeitura> UsuarioSubprefeituras => Set<UsuarioSubprefeitura>();
    public DbSet<TokenRecuperacaoSenha> TokensRecuperacaoSenha => Set<TokenRecuperacaoSenha>();
    public DbSet<AssinaturaPush> AssinaturasPush => Set<AssinaturaPush>();
    public DbSet<OcorrenciaAlagamento> OcorrenciasAlagamento => Set<OcorrenciaAlagamento>();
    public DbSet<PrevisaoClimatica> PrevisoesClimaticas => Set<PrevisaoClimatica>();
    public DbSet<NotificacaoEnviada> NotificacoesEnviadas => Set<NotificacaoEnviada>();

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
            e.Property(u => u.Ativo).HasDefaultValue(true);
            e.HasIndex(u => u.Role);
        });

        modelBuilder.Entity<Regiao>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Nome).IsRequired().HasMaxLength(100);
            e.Property(r => r.FusoHorario).IsRequired().HasMaxLength(64);
            e.HasMany(r => r.Subprefeituras)
             .WithOne(s => s.Regiao)
             .HasForeignKey(s => s.RegiaoId)
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
            // Score deriva de uma leitura e compartilha seu ciclo de 24h: ao limpar
            // leituras antigas, os scores associados são removidos em cascata.
            e.HasOne(s => s.Leitura)
             .WithMany()
             .HasForeignKey(s => s.LeituraId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Sugestao>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Categoria).IsRequired().HasMaxLength(50);
            e.Property(s => s.Titulo).IsRequired().HasMaxLength(200);
            e.Property(s => s.Descricao).IsRequired().HasMaxLength(1000);
            e.HasIndex(s => new { s.Categoria, s.FaixaRisco });
        });

        modelBuilder.Entity<UsuarioSubprefeitura>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => new { f.UsuarioId, f.SubprefeituraId }).IsUnique();
            e.HasOne(f => f.Usuario)
             .WithMany(u => u.Favoritos)
             .HasForeignKey(f => f.UsuarioId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.Subprefeitura)
             .WithMany()
             .HasForeignKey(f => f.SubprefeituraId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TokenRecuperacaoSenha>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.TokenHash).IsRequired().HasMaxLength(64);
            e.HasIndex(t => t.TokenHash);
            e.HasOne(t => t.Usuario)
             .WithMany()
             .HasForeignKey(t => t.UsuarioId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AssinaturaPush>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Endpoint).IsRequired().HasMaxLength(1000);
            e.HasIndex(a => a.Endpoint).IsUnique();
            e.Property(a => a.P256dh).IsRequired();
            e.Property(a => a.Auth).IsRequired();
            e.HasIndex(a => a.UsuarioId);
            e.HasOne(a => a.Usuario)
             .WithMany()
             .HasForeignKey(a => a.UsuarioId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OcorrenciaAlagamento>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.CdIdentificador).IsRequired().HasMaxLength(50);
            e.Property(o => o.FonteOriginal).HasMaxLength(50);
            e.Property(o => o.NmSubprefeitura).HasMaxLength(120);
            e.HasIndex(o => new { o.CdIdentificador, o.Tipo }).IsUnique();
            e.HasIndex(o => o.DataOcorrencia);
        });

        modelBuilder.Entity<AgregadoDiario>(e =>
        {
            e.HasKey(a => a.Id);
            // Chave do upsert. É o que impede a série de duplicar quando o mesmo dia
            // é recalculado a cada ciclo de coleta.
            e.HasIndex(a => new { a.SubprefeituraId, a.Dia }).IsUnique();
            e.Property(a => a.FusoHorario).IsRequired().HasMaxLength(64);
            e.HasOne(a => a.Subprefeitura)
             .WithMany()
             .HasForeignKey(a => a.SubprefeituraId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PrevisaoClimatica>(e =>
        {
            e.HasKey(p => p.Id);
            // Chave do upsert: impede a previsão de duplicar quando a mesma faixa de 3h
            // é rebuscada a cada hora.
            e.HasIndex(p => new { p.SubprefeituraId, p.InstantePrevisto }).IsUnique();
            e.Property(p => p.CondicaoDescricao).IsRequired().HasMaxLength(120);
            e.HasOne(p => p.Subprefeitura)
             .WithMany()
             .HasForeignKey(p => p.SubprefeituraId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NotificacaoEnviada>(e =>
        {
            e.HasKey(n => n.Id);
            // Único por pessoa: "esta pessoa foi avisada deste evento" exatamente uma vez,
            // mesmo com dois ciclos sobrepostos.
            e.HasIndex(n => new { n.UsuarioId, n.Chave }).IsUnique();
            // Serve dedup por cooldown e teto diário (sempre por pessoa e janela de tempo).
            e.HasIndex(n => new { n.UsuarioId, n.EnviadoEm });
            e.Property(n => n.Gatilho).IsRequired().HasMaxLength(40);
            e.Property(n => n.Chave).IsRequired().HasMaxLength(160);
            e.HasOne(n => n.Usuario).WithMany().HasForeignKey(n => n.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Subprefeitura).WithMany().HasForeignKey(n => n.SubprefeituraId).OnDelete(DeleteBehavior.Cascade);
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

        const string fusoSp = "America/Sao_Paulo";
        modelBuilder.Entity<Regiao>().HasData(
            new { Id = idCentro, Nome = "Centro", FusoHorario = fusoSp, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idLeste,  Nome = "Leste",  FusoHorario = fusoSp, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idNorte,  Nome = "Norte",  FusoHorario = fusoSp, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idOeste,  Nome = "Oeste",  FusoHorario = fusoSp, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = idSul,    Nome = "Sul",    FusoHorario = fusoSp, CriadoEm = seedDate, AtualizadoEm = seedDate }
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
            new { Id = new Guid("20000000-0000-0000-0000-000000000012"), RegiaoId = idLeste,  Nome = "São Miguel",                  Latitude = -23.495421, Longitude = -46.437505, Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
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

        // --- Catálogo de dicas por perigo (3 perigos × Atenção/Alerta × 3 = 18) ---
        // Fontes: orientações da Defesa Civil (chuva, alagamento, vendaval) e guia de onda
        // de calor do Ministério da Saúde. Ver docs/superpowers/specs/2026-10-07-s3-n1-*.md.
        modelBuilder.Entity<Sugestao>().HasData(
            new { Id = new Guid("30000000-0000-0000-0000-000000000101"), Categoria = "ALAGAMENTO", FaixaRisco = FaixaRisco.MODERADO, Ordem = 1, Titulo = "Fique de olho na chuva", Descricao = "Se ela apertar, adie saídas e evite áreas baixas e margens de córregos.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000102"), Categoria = "ALAGAMENTO", FaixaRisco = FaixaRisco.MODERADO, Ordem = 2, Titulo = "Prepare a casa", Descricao = "Limpe calhas e ralos e tire do chão documentos e objetos que não podem molhar.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000103"), Categoria = "ALAGAMENTO", FaixaRisco = FaixaRisco.MODERADO, Ordem = 3, Titulo = "Planeje o caminho", Descricao = "Prefira trajetos que você sabe que não alagam e saia com o celular carregado.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000104"), Categoria = "ALAGAMENTO", FaixaRisco = FaixaRisco.ALTO, Ordem = 1, Titulo = "Não atravesse água", Descricao = "Nunca entre em rua alagada a pé ou de carro. Pouca água já pode arrastar um carro e esconder um bueiro aberto.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000105"), Categoria = "ALAGAMENTO", FaixaRisco = FaixaRisco.ALTO, Ordem = 2, Titulo = "Procure um lugar alto", Descricao = "Se a água subir, vá para um ponto elevado e deixe o carro longe de córregos e baixadas.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000106"), Categoria = "ALAGAMENTO", FaixaRisco = FaixaRisco.ALTO, Ordem = 3, Titulo = "Desligue a energia", Descricao = "Se a água entrar em casa, desligue a chave geral e tire os aparelhos da tomada. Em perigo, ligue 199 ou 193.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000107"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Ordem = 1, Titulo = "Recolha o que pode voar", Descricao = "Guarde vasos, roupas do varal e objetos soltos em sacadas e quintais.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000108"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Ordem = 2, Titulo = "Feche bem a casa", Descricao = "Feche portas e janelas e confira se telhas e antenas estão firmes.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000109"), Categoria = "VENTO", FaixaRisco = FaixaRisco.MODERADO, Ordem = 3, Titulo = "Evite parar sob árvores", Descricao = "Na rua, não estacione nem espere o ônibus embaixo de árvores, placas ou fiação.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000110"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Ordem = 1, Titulo = "Fique abrigado", Descricao = "Se puder, fique dentro de um prédio firme e longe das janelas.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000111"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Ordem = 2, Titulo = "Longe de árvores e fios", Descricao = "Não se abrigue sob árvores, marquises, placas ou postes. Viu fio caído? Não toque e ligue 199.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000112"), Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Ordem = 3, Titulo = "Cuidado com raios", Descricao = "Tire aparelhos da tomada e evite usar o celular enquanto ele carrega.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000113"), Categoria = "CALOR", FaixaRisco = FaixaRisco.MODERADO, Ordem = 1, Titulo = "Beba água o dia todo", Descricao = "Não espere ter sede e leve uma garrafa quando sair.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000114"), Categoria = "CALOR", FaixaRisco = FaixaRisco.MODERADO, Ordem = 2, Titulo = "Fuja do sol forte", Descricao = "Evite o sol direto entre 10h e 16h e use roupa leve, chapéu e protetor solar.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000115"), Categoria = "CALOR", FaixaRisco = FaixaRisco.MODERADO, Ordem = 3, Titulo = "Cuide de quem sente mais", Descricao = "Idosos, crianças, gestantes e pessoas com doenças crônicas sofrem primeiro com o calor. Ofereça água a eles.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000116"), Categoria = "CALOR", FaixaRisco = FaixaRisco.ALTO, Ordem = 1, Titulo = "Diminua o esforço", Descricao = "Deixe exercício e trabalho pesado ao ar livre para o começo da manhã ou o fim da tarde.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000117"), Categoria = "CALOR", FaixaRisco = FaixaRisco.ALTO, Ordem = 2, Titulo = "Mantenha o corpo fresco", Descricao = "Fique em lugar ventilado ou na sombra e tome banhos frescos.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate },
            new { Id = new Guid("30000000-0000-0000-0000-000000000118"), Categoria = "CALOR", FaixaRisco = FaixaRisco.ALTO, Ordem = 3, Titulo = "Conheça os sinais", Descricao = "Tontura, fraqueza, náusea, dor de cabeça e cãibras pedem cuidado. Se aparecerem, procure a unidade de saúde mais próxima.", Ativa = true, CriadoEm = seedDate, AtualizadoEm = seedDate });
    }
}
