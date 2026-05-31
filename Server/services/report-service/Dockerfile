FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY services/report-service/report-service.csproj ./services/report-service/
RUN dotnet restore ./services/report-service/report-service.csproj
COPY services/report-service/. ./services/report-service/
COPY BuildingBlocks/ ./BuildingBlocks/
RUN dotnet publish ./services/report-service/report-service.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "report-service.dll"]