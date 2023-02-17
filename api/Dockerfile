FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /source

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:7.0
VOLUME ["/data"]
WORKDIR /app
COPY --from=build /app .
EXPOSE 80
ENTRYPOINT ["dotnet", "api.dll"]
