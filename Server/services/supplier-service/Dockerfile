FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/supplier-service/supplier-service.csproj .
COPY BuildingBlocks ./BuildingBlocks
RUN dotnet restore
COPY services/supplier-service .
RUN dotnet publish supplier-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "supplier-service.dll"]
