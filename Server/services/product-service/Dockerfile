FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/product-service/product-service.csproj ./services/product-service/
RUN dotnet restore ./services/product-service/product-service.csproj
COPY services/product-service/. ./services/product-service/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/product-service/product-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "product-service.dll"]