using System.Text.Json;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using ReportService.DTOs;
using ReportService.Models;
using ReportService.Repositories.Interfaces;
using ReportService.Services.Interfaces;
using BuildingBlocks;

namespace ReportService.Business
{
    public class ReportService : IReportService
    {
        private readonly IReportRepository _repository;
        private readonly INotificationClient _notificationClient;

        public ReportService(IReportRepository repository, INotificationClient notificationClient)
        {
            _repository = repository;
            _notificationClient = notificationClient;
        }

        public async Task<IEnumerable<ReportDto>> GetAllReportsAsync()
        {
            var reports = await _repository.GetAllAsync();
            return reports.Select(MapToDto);
        }

        public async Task<ReportDto?> GetReportByIdAsync(int id)
        {
            var report = await _repository.GetByIdAsync(id);
            return report == null ? null : MapToDto(report);
        }

        public async Task<IEnumerable<ReportDto>> GetReportsByTypeAsync(string type)
        {
            var reports = await _repository.GetByTypeAsync(type);
            return reports.Select(MapToDto);
        }

        public async Task<IEnumerable<ReportDto>> GetReportsByDateRangeAsync(DateTime start, DateTime end)
        {
            var reports = await _repository.GetByDateRangeAsync(start, end);
            return reports.Select(MapToDto);
        }

        public async Task<ReportDto> GenerateReportAsync(GenerateReportDto dto, int userId)
        {
            var reportData = await GenerateReportDataAsync(dto);

            var report = new Report
            {
                Type = dto.Type,
                Name = dto.Name,
                Data = JsonSerializer.Serialize(reportData),
                GeneratedAt = DateTime.UtcNow,
                GeneratedBy = userId,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            var created = await _repository.CreateAsync(report);

            await _repository.CreateLogAsync(new ReportLog
            {
                ReportId = created.Id,
                Status = "Success",
                ExecutedAt = DateTime.UtcNow
            });

            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "ReportGenerated",
                "Report Generated",
                $"Report '{created.Name}' (Type: {created.Type}) has been generated successfully. ID: {created.Id}.",
                $"/reports/{created.Id}"
            );

            await _notificationClient.SendNotificationToRoleAsync(
                "Manager",
                "ReportGenerated",
                "Report Generated",
                $"Report '{created.Name}' (Type: {created.Type}) has been generated successfully. ID: {created.Id}.",
                $"/reports/{created.Id}"
            );

            return MapToDto(created);
        }

        public async Task<ReportSummaryDto> GetReportSummaryAsync()
        {
            var now = DateTime.UtcNow;
            var weekStart = now.AddDays(-7);
            var monthStart = now.AddDays(-30);

            return new ReportSummaryDto
            {
                TotalReports = await _repository.GetCountByDateRangeAsync(DateTime.MinValue, DateTime.MaxValue),
                ReportsThisWeek = await _repository.GetCountByDateRangeAsync(weekStart, now),
                ReportsThisMonth = await _repository.GetCountByDateRangeAsync(monthStart, now),
                ReportsByType = new Dictionary<string, int>
                {
                    { "Sales", await _repository.GetCountByTypeAsync("Sales") },
                    { "Inventory", await _repository.GetCountByTypeAsync("Inventory") },
                    { "Orders", await _repository.GetCountByTypeAsync("Orders") },
                    { "Revenue", await _repository.GetCountByTypeAsync("Revenue") },
                    { "Performance", await _repository.GetCountByTypeAsync("Performance") }
                }
            };
        }

        public async Task<bool> DeleteReportAsync(int id)
        {
            var report = await _repository.GetByIdAsync(id);
            if (report == null)
                return false;

            await _repository.DeleteAsync(id);

            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "ReportDeleted",
                "Report Deleted",
                $"Report '{report.Name}' (Type: {report.Type}) has been deleted.",
                "/reports"
            );

            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await DeleteReportAsync(id);
        }

        public async Task<IEnumerable<ReportDto>> GetAllAsync()
        {
            return await GetAllReportsAsync();
        }

        public async Task<ReportDto?> GetByIdAsync(int id)
        {
            return await GetReportByIdAsync(id);
        }

        public async Task<IEnumerable<ReportDto>> GetByTypeAsync(string type)
        {
            return await GetReportsByTypeAsync(type);
        }

        public async Task<byte[]> GeneratePdfAsync(ReportDto report)
        {
            using var stream = new MemoryStream();
            using var writer = new PdfWriter(stream);
            using var pdf = new PdfDocument(writer);
            using var document = new Document(pdf);

            document.Add(new Paragraph(report.Name)
                .SetFontSize(20)
                .SetBold());
            document.Add(new Paragraph($"Type: {report.Type}"));
            document.Add(new Paragraph($"Generated: {report.GeneratedAt:yyyy-MM-dd HH:mm} UTC"));

            if (string.IsNullOrWhiteSpace(report.Data))
            {
                document.Add(new Paragraph("No report data was saved for this report."));
            }
            else
            {
                using var json = JsonDocument.Parse(report.Data);
                AddJsonContent(document, json.RootElement);
            }

            document.Close();
            return await Task.FromResult(stream.ToArray());
        }

        public async Task<ReportSummaryDto> GetSummaryAsync()
        {
            return await GetReportSummaryAsync();
        }

        private async Task<object> GenerateReportDataAsync(GenerateReportDto dto)
        {
            if (dto.Data is { ValueKind: not JsonValueKind.Undefined and not JsonValueKind.Null } data)
            {
                return await Task.FromResult(data);
            }

            return await Task.FromResult(new
            {
                Type = dto.Type,
                Name = dto.Name,
                GeneratedAt = DateTime.UtcNow,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Filters = new
                {
                    UserId = dto.UserId,
                    ProductId = dto.ProductId,
                    OrderId = dto.OrderId
                },
                Data = new
                {
                    Message = "Report data will be generated here",
                    Total = 0,
                    Items = new List<object>()
                }
            });
        }

        private static void AddJsonContent(Document document, JsonElement root)
        {
            if (TryGetProperty(root, "metrics", out var metrics))
            {
                document.Add(new Paragraph("Key Metrics").SetBold().SetFontSize(14));
                var table = new Table(UnitValue.CreatePercentArray(new float[] { 2, 1 }))
                    .UseAllAvailableWidth();
                table.AddHeaderCell("Metric");
                table.AddHeaderCell("Value");
                AddMetricRow(table, "Total revenue", GetString(metrics, "totalRevenue"));
                AddMetricRow(table, "Delivered shipments", GetString(metrics, "deliveredShipments"));
                AddMetricRow(table, "In transit shipments", GetString(metrics, "inTransitShipments"));
                AddMetricRow(table, "Pending shipments", GetString(metrics, "pendingShipments"));
                AddMetricRow(table, "Active products", GetString(metrics, "activeProducts"));
                AddMetricRow(table, "Active warehouses", GetString(metrics, "activeWarehouses"));
                AddMetricRow(table, "Low stock alerts", GetString(metrics, "lowStockAlerts"));
                document.Add(table);
            }

            if (TryGetProperty(root, "topOrders", out var topOrders) && topOrders.ValueKind == JsonValueKind.Array)
            {
                document.Add(new Paragraph("Top Orders").SetBold().SetFontSize(14));
                var table = new Table(UnitValue.CreatePercentArray(new float[] { 2, 1, 1, 1 }))
                    .UseAllAvailableWidth();
                table.AddHeaderCell("Order");
                table.AddHeaderCell("Status");
                table.AddHeaderCell("Items");
                table.AddHeaderCell("Amount");

                foreach (var order in topOrders.EnumerateArray())
                {
                    table.AddCell(GetString(order, "orderNumber"));
                    table.AddCell(GetString(order, "status"));
                    table.AddCell(GetString(order, "itemsCount"));
                    table.AddCell(GetString(order, "totalAmount"));
                }

                document.Add(table);
            }

            if (TryGetProperty(root, "lowStockAlerts", out var alerts) && alerts.ValueKind == JsonValueKind.Array)
            {
                document.Add(new Paragraph("Low Stock Alerts").SetBold().SetFontSize(14));
                var table = new Table(UnitValue.CreatePercentArray(new float[] { 2, 2, 1, 1, 1 }))
                    .UseAllAvailableWidth();
                table.AddHeaderCell("Product");
                table.AddHeaderCell("Warehouse");
                table.AddHeaderCell("Current");
                table.AddHeaderCell("Minimum");
                table.AddHeaderCell("Deficit");

                foreach (var alert in alerts.EnumerateArray())
                {
                    table.AddCell(GetString(alert, "productName"));
                    table.AddCell(GetString(alert, "warehouseName"));
                    table.AddCell(GetString(alert, "currentQuantity"));
                    table.AddCell(GetString(alert, "minimumLevel"));
                    table.AddCell(GetString(alert, "deficit"));
                }

                document.Add(table);
            }
        }

        private static void AddMetricRow(Table table, string label, string value)
        {
            table.AddCell(label);
            table.AddCell(value);
        }

        private static bool TryGetProperty(JsonElement element, string name, out JsonElement property)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                return element.TryGetProperty(name, out property);
            }

            property = default;
            return false;
        }

        private static string GetString(JsonElement element, string name)
        {
            if (!TryGetProperty(element, name, out var property))
            {
                return "-";
            }

            return property.ValueKind switch
            {
                JsonValueKind.String => property.GetString() ?? "-",
                JsonValueKind.Number => property.GetRawText(),
                JsonValueKind.True => "Yes",
                JsonValueKind.False => "No",
                JsonValueKind.Null => "-",
                _ => property.GetRawText()
            };
        }

        private ReportDto MapToDto(Report report)
        {
            return new ReportDto
            {
                Id = report.Id,
                Type = report.Type,
                Name = report.Name ?? string.Empty,
                Data = report.Data,
                GeneratedAt = report.GeneratedAt,
                GeneratedBy = report.GeneratedBy
            };
        }
    }
}
