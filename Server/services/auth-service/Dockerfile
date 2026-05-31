FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/auth-service/auth-service.csproj .
COPY BuildingBlocks ./BuildingBlocks
RUN dotnet restore
COPY services/auth-service .
RUN dotnet publish auth-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "auth-service.dll"]
