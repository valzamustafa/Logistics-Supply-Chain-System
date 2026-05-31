FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/tracking-services/tracking-service.csproj ./services/tracking-services/
RUN dotnet restore ./services/tracking-services/tracking-service.csproj
COPY services/tracking-services/. ./services/tracking-services/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/tracking-services/tracking-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "tracking-service.dll"]