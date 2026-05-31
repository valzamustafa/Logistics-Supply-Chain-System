FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/warehouse-service/warehouse-service.csproj ./services/warehouse-service/
RUN dotnet restore ./services/warehouse-service/warehouse-service.csproj
COPY services/warehouse-service/. ./services/warehouse-service/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/warehouse-service/warehouse-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "warehouse-service.dll"]