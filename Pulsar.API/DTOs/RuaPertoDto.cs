namespace Pulsar.API.DTOs;

/// <summary>A rua mais perto de um ponto (geocoding reverso) e a distância até ela, em metros. Null quando não há.</summary>
public record RuaPertoDto(string? Rua, int? Metros);
