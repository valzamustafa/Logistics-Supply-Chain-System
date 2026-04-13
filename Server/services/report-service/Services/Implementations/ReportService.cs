using System.Text.Json;
using ReportService.DTOs;
using ReportService.Models;
using ReportService.Repositories.Interfaces;
using ReportService.Services.Interfaces;

namespace ReportService.Business
{
    public class ReportService : IReportService
    {
        private readonly IReportRepository _repository;

        public ReportService(IReportRepository repository)
        {
            _repository = repository;
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
            return true;
        }

        private async Task<object> GenerateReportDataAsync(GenerateReportDto dto)
        {
            
            
            return new
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
            };
        }

        private ReportDto MapToDto(Report report)
        {
            return new ReportDto
            {
                Id = report.Id,
                Type = report.Type,
                Name = report.Name,
                Data = report.Data,
                GeneratedAt = report.GeneratedAt,
                GeneratedBy = report.GeneratedBy
            };
        }
    }
}