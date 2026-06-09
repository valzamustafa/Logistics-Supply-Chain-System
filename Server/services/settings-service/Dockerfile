# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["services/settings-service/settings-service.csproj", "services/settings-service/"]
COPY ["BuildingBlocks/BuildingBlocks.csproj", "BuildingBlocks/"]
RUN dotnet restore "services/settings-service/settings-service.csproj"
COPY . .
WORKDIR "/src/services/settings-service"
RUN dotnet build "settings-service.csproj" -c Release -o /app/build

FROM build AS publish
WORKDIR "/src/services/settings-service"
RUN dotnet publish "settings-service.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
EXPOSE 80
EXPOSE 443
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "settings-service.dll"]
