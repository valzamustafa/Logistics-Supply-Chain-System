using Microsoft.EntityFrameworkCore;
using ShipmentService.Models;

namespace ShipmentService.Data;

public class ShipmentDbContext : DbContext
{
    public ShipmentDbContext(DbContextOptions<ShipmentDbContext> options) : base(options)
    {
    }
    
    public DbSet<Shipment> Shipments { get; set; }
    public DbSet<ShipmentItem> ShipmentItems { get; set; }
    public DbSet<Driver> Drivers { get; set; }
    public DbSet<Vehicle> Vehicles { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configure relationships
        modelBuilder.Entity<Shipment>()
            .HasOne(s => s.Driver)
            .WithMany(d => d.Shipments)
            .HasForeignKey(s => s.DriverId)
            .OnDelete(DeleteBehavior.SetNull);
            
        modelBuilder.Entity<Shipment>()
            .HasOne(s => s.Vehicle)
            .WithMany(v => v.Shipments)
            .HasForeignKey(s => s.VehicleId)
            .OnDelete(DeleteBehavior.SetNull);
            
        modelBuilder.Entity<ShipmentItem>()
            .HasOne(si => si.Shipment)
            .WithMany(s => s.Items)
            .HasForeignKey(si => si.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Add indexes
        modelBuilder.Entity<Shipment>()
            .HasIndex(s => s.TrackingNumber)
            .IsUnique();
            
        modelBuilder.Entity<Shipment>()
            .HasIndex(s => s.OrderId);
            
        modelBuilder.Entity<Driver>()
            .HasIndex(d => d.UserId)
            .IsUnique();
            
        modelBuilder.Entity<Vehicle>()
            .HasIndex(v => v.PlateNumber)
            .IsUnique();
    }
}