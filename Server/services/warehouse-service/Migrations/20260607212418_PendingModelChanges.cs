using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace warehouseservice.Migrations
{
    /// <inheritdoc />
    public partial class PendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProductName",
                table: "WarehouseStocks");

            migrationBuilder.DropColumn(
                name: "ProductSku",
                table: "WarehouseStocks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProductName",
                table: "WarehouseStocks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductSku",
                table: "WarehouseStocks",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
