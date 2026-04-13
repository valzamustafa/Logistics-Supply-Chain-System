using Microsoft.EntityFrameworkCore;
using ReportService.Data;
using ReportService.Models;
using ReportService.Repositories.Interfaces;

namespace ReportService.Repositories.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly ReportDbContext _context;

        public ReportRepository(ReportDbContext context)
        {
            _context = context;
        }

        public async Task<Report?> GetByIdAsync(int id)
        {
            return await _context.Reports.FindAsync(id);
        }

        public async Task<IEnumerable<Report>> GetAllAsync()
        {
            return await _context.Reports
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Report>> GetByTypeAsync(string type)
        {
            return await _context.Reports
                .Where(r => r.Type == type)
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Report>> GetByDateRangeAsync(DateTime start, DateTime end)
        {
            return await _context.Reports
                .Where(r => r.GeneratedAt >= start && r.GeneratedAt <= end)
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<Report> CreateAsync(Report report)
        {
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return report;
        }

        public async Task<Report> UpdateAsync(Report report)
        {
            _context.Entry(report).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return report;
        }

        public async Task DeleteAsync(int id)
        {
            var report = await GetByIdAsync(id);
            if (report != null)
            {
                _context.Reports.Remove(report);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<ReportLog> CreateLogAsync(ReportLog log)
        {
            _context.ReportLogs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }

        public async Task<int> GetCountByTypeAsync(string type)
        {
            return await _context.Reports.CountAsync(r => r.Type == type);
        }

        public async Task<int> GetCountByDateRangeAsync(DateTime start, DateTime end)
        {
            return await _context.Reports
                .CountAsync(r => r.GeneratedAt >= start && r.GeneratedAt <= end);
        }
    }
}