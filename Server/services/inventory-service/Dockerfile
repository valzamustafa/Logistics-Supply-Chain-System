FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/inventory-service/inventory-service.csproj ./services/inventory-service/
RUN dotnet restore ./services/inventory-service/inventory-service.csproj
COPY services/inventory-service/. ./services/inventory-service/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/inventory-service/inventory-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "inventory-service.dll"]