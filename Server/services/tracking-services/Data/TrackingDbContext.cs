using Microsoft.EntityFrameworkCore;
using TrackingService.Models;

namespace TrackingService.Data
{
    public class TrackingDbContext : DbContext
    {
        public TrackingDbContext(DbContextOptions<TrackingDbContext> options) : base(options) { }

        public DbSet<Tracking> Trackings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Tracking>()
                .HasIndex(t => t.ShipmentId)
                .IsUnique();
        }
    }
}