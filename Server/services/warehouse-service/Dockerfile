FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/warehouse-service/warehouse-service.csproj .
COPY BuildingBlocks ./BuildingBlocks
RUN dotnet restore
COPY services/warehouse-service .
RUN dotnet publish warehouse-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "warehouse-service.dll"]
