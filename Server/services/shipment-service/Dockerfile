FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src


COPY services/shipment-service/*.csproj ./
COPY BuildingBlocks ./BuildingBlocks
RUN dotnet restore shipment-service.csproj


COPY services/shipment-service . 
RUN dotnet publish shipment-service.csproj -c Release -o /app/publish


FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
EXPOSE 80
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "shipment-service.dll"]