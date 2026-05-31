FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/order-service/order-service.csproj ./services/order-service/
RUN dotnet restore ./services/order-service/order-service.csproj
COPY services/order-service/. ./services/order-service/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/order-service/order-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "order-service.dll"]