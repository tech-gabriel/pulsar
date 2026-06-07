# syntax=docker/dockerfile:1
# Dockerfile do backend Pulsar.API (.NET 10 / ASP.NET Core).
# Multi-stage: SDK para build/publish, runtime ASP.NET enxuto para a imagem final.

# ---- Build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restaura primeiro com apenas o .csproj para aproveitar o cache de camadas
# (só refaz o restore quando as dependências mudam, não a cada alteração de código).
COPY Pulsar.API/Pulsar.API.csproj Pulsar.API/
RUN dotnet restore Pulsar.API/Pulsar.API.csproj

# Copia o restante do código e publica em Release.
COPY Pulsar.API/ Pulsar.API/
RUN dotnet publish Pulsar.API/Pulsar.API.csproj -c Release -o /app --no-restore

# ---- Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Kestrel escuta HTTP na 8080 (TLS é terminado pela plataforma/proxy).
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Executa como usuário não-root (já incluído na imagem aspnet).
USER $APP_UID

COPY --from=build /app .
ENTRYPOINT ["dotnet", "Pulsar.API.dll"]
