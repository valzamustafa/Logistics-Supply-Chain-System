using Microsoft.EntityFrameworkCore;
using WarehouseService.Models;

namespace WarehouseService.Data
{
    public class WarehouseDbContext : DbContext
    {
        public WarehouseDbContext(DbContextOptions<WarehouseDbContext> options) 
            : base(options) { }

        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<WarehouseZone> WarehouseZones { get; set; }
        public DbSet<WarehouseStaff> WarehouseStaff { get; set; }
        public DbSet<WarehouseStock> WarehouseStocks { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

      
            modelBuilder.Entity<Warehouse>(entity =>
            {
                entity.HasIndex(w => w.Name).IsUnique();
                entity.Property(w => w.Name).IsRequired().HasMaxLength(100);
                entity.Property(w => w.Location).HasMaxLength(500);
                entity.Property(w => w.Phone).HasMaxLength(20);
            });

           
            modelBuilder.Entity<WarehouseZone>(entity =>
            {
                entity.HasKey(z => z.Id);
                entity.Property(z => z.ZoneName).IsRequired().HasMaxLength(50);
                entity.Property(z => z.Description).HasMaxLength(255);
                
                entity.HasOne(z => z.Warehouse)
                    .WithMany(w => w.Zones)
                    .HasForeignKey(z => z.WarehouseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        
            modelBuilder.Entity<WarehouseStaff>(entity =>
            {
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Position).HasMaxLength(50);
                
                entity.HasOne(s => s.Warehouse)
                    .WithMany(w => w.Staff)
                    .HasForeignKey(s => s.WarehouseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });


            modelBuilder.Entity<WarehouseStock>(entity =>
            {
                entity.HasKey(ws => ws.Id);
                
                entity.HasIndex(ws => new { ws.WarehouseId, ws.ProductId })
                    .IsUnique();
                
                entity.Property(ws => ws.Quantity)
                    .IsRequired()
                    .HasDefaultValue(0);
                
                entity.Property(ws => ws.MinimumStockLevel)
                    .HasDefaultValue(5);
                
                entity.Property(ws => ws.MaximumStockLevel)
                    .HasDefaultValue(1000);
                
                entity.Property(ws => ws.ShelfLocation)
                    .HasMaxLength(100);
                
                entity.HasOne(ws => ws.Warehouse)
                    .WithMany(w => w.Stocks)
                    .HasForeignKey(ws => ws.WarehouseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        
            modelBuilder.Entity<StockMovement>(entity =>
            {
                entity.HasKey(sm => sm.Id);
                
                entity.Property(sm => sm.Type)
                    .IsRequired();
                
                entity.Property(sm => sm.Quantity)
                    .IsRequired();
                
                entity.Property(sm => sm.Reference)
                    .HasMaxLength(500);
                
                entity.Property(sm => sm.Notes)
                    .HasMaxLength(1000);
                
                entity.HasIndex(sm => sm.ProductId);
                entity.HasIndex(sm => sm.CreatedAt);
                entity.HasIndex(sm => sm.Type);
                
                entity.HasOne(sm => sm.WarehouseStock)
                    .WithMany(ws => ws.Movements)
                    .HasForeignKey(sm => sm.WarehouseStockId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.CreatedBy))
                        .IsRequired();
                    
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.UpdatedBy))
                        .IsRequired();
                    
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.CreatedAt))
                        .IsRequired()
                        .HasDefaultValueSql("GETUTCDATE()");
                    
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.UpdatedAt))
                        .IsRequired()
                        .HasDefaultValueSql("GETUTCDATE()");
                }
            }
        }
    }
}