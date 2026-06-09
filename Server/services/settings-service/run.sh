#!/bin/bash

# Settings Service Deployment Script
# This script sets up and runs the Settings Service

set -e

echo "================================"
echo "Settings Service Setup Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="Settings Service"
SERVICE_PATH="./Server/services/settings-service"
PORT_HTTP="5010"
PORT_HTTPS="7010"
DOTNET_VERSION="8.0"

echo -e "${BLUE}Starting $SERVICE_NAME setup...${NC}"
echo ""

# Check if .NET is installed
echo -e "${YELLOW}Checking .NET installation...${NC}"
if ! command -v dotnet &> /dev/null; then
    echo -e "${RED}ERROR: .NET is not installed${NC}"
    echo "Please install .NET $DOTNET_VERSION from https://dotnet.microsoft.com/download"
    exit 1
fi

DOTNET_VERSION_INSTALLED=$(dotnet --version)
echo -e "${GREEN}✓ .NET $DOTNET_VERSION_INSTALLED found${NC}"
echo ""

# Check if SQL Server is running
echo -e "${YELLOW}Checking SQL Server connection...${NC}"
if ! sqlcmd -S localhost -E -Q "SELECT 1" &> /dev/null; then
    echo -e "${YELLOW}WARNING: Could not connect to SQL Server${NC}"
    echo "Ensure SQL Server is running on localhost"
    echo "The application will attempt to create the database"
fi
echo ""

# Navigate to service directory
echo -e "${YELLOW}Navigating to $SERVICE_PATH...${NC}"
cd "$SERVICE_PATH" || exit 1
echo -e "${GREEN}✓ In service directory${NC}"
echo ""

# Restore packages
echo -e "${YELLOW}Restoring NuGet packages...${NC}"
dotnet restore
echo -e "${GREEN}✓ Packages restored${NC}"
echo ""

# Build project
echo -e "${YELLOW}Building project...${NC}"
dotnet build
echo -e "${GREEN}✓ Project built${NC}"
echo ""

# Run project
echo -e "${YELLOW}Starting $SERVICE_NAME...${NC}"
echo -e "${BLUE}Service will run on:${NC}"
echo -e "  HTTP:  http://localhost:$PORT_HTTP"
echo -e "  HTTPS: https://localhost:$PORT_HTTPS"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the service${NC}"
echo ""

dotnet run

echo ""
echo -e "${GREEN}$SERVICE_NAME stopped${NC}"
