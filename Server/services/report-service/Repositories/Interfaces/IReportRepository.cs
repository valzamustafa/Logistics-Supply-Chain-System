using ReportService.Models;

namespace ReportService.Repositories.Interfaces
{
    public interface IReportRepository
    {
        Task<Report?> GetByIdAsync(int id);
        Task<IEnumerable<Report>> GetAllAsync();
        Task<IEnumerable<Report>> GetByTypeAsync(string type);
        Task<IEnumerable<Report>> GetByDateRangeAsync(DateTime start, DateTime end);
        Task<Report> CreateAsync(Report report);
        Task<Report> UpdateAsync(Report report);
        Task DeleteAsync(int id);
        Task<ReportLog> CreateLogAsync(ReportLog log);
        Task<int> GetCountByTypeAsync(string type);
        Task<int> GetCountByDateRangeAsync(DateTime start, DateTime end);
    }
}