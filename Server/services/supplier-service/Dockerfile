FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/supplier-service/supplier-service.csproj ./services/supplier-service/
RUN dotnet restore ./services/supplier-service/supplier-service.csproj
COPY services/supplier-service/. ./services/supplier-service/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/supplier-service/supplier-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "supplier-service.dll"]