using Microsoft.EntityFrameworkCore;
using ReportService.Models;

namespace ReportService.Data
{
    public class ReportDbContext : DbContext
    {
        public ReportDbContext(DbContextOptions<ReportDbContext> options) : base(options) { }

        public DbSet<Report> Reports { get; set; }
        public DbSet<ReportLog> ReportLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Report>().HasIndex(r => r.Type);
            modelBuilder.Entity<Report>().HasIndex(r => r.GeneratedAt);
        }
    }
}