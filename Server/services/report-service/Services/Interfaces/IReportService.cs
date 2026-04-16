using ReportService.DTOs;

namespace ReportService.Services.Interfaces
{
    public interface IReportService
    {
        Task<IEnumerable<ReportDto>> GetAllReportsAsync();
        Task<ReportDto?> GetReportByIdAsync(int id);
        Task<IEnumerable<ReportDto>> GetReportsByTypeAsync(string type);
        Task<IEnumerable<ReportDto>> GetReportsByDateRangeAsync(DateTime start, DateTime end);
        Task<ReportDto> GenerateReportAsync(GenerateReportDto dto, int userId);
        Task<ReportSummaryDto> GetReportSummaryAsync();
        Task<bool> DeleteReportAsync(int id);
    }
}