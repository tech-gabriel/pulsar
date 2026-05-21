using Microsoft.EntityFrameworkCore;
using Pulsar.API.External.Clients;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Scheduler;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<PulsarDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient("openweathermap", (sp, client) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    client.BaseAddress = new Uri(config["OpenWeatherMap:BaseUrl"]
        ?? "https://api.openweathermap.org/data/2.5/");
    if (!client.BaseAddress.AbsoluteUri.EndsWith('/'))
        client.BaseAddress = new Uri(client.BaseAddress.AbsoluteUri + "/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddScoped<IWeatherClient, OpenWeatherMapClient>();

builder.Services.AddScoped<ISubprefeituraRepository, SubprefeituraRepository>();
builder.Services.AddScoped<ILeituraRepository, LeituraRepository>();
builder.Services.AddScoped<IScoreRepository, ScoreRepository>();
builder.Services.AddScoped<ISugestaoRepository, SugestaoRepository>();
builder.Services.AddScoped<IAlertaRepository, AlertaRepository>();

builder.Services.AddScoped<IClimateService, ClimateService>();
builder.Services.AddScoped<IScoreService, ScoreService>();
builder.Services.AddScoped<ISugestaoService, SugestaoService>();
builder.Services.AddScoped<IAlertaService, AlertaService>();

builder.Services.AddHostedService<DataCollectionJob>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
