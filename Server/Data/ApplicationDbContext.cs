using Microsoft.EntityFrameworkCore;
using AuthService.Models;
using ProductService.Models;
using OrderService.Models;
using InventoryService.Models;
using WarehouseService.Models;
using SupplierService.Models;
using ShipmentService.Models;
using AuthNotification = AuthService.Models.Notification;
using AuthFile = AuthService.Models.File;
using AuthBaseEntity = AuthService.Models.BaseEntity;
using ShipmentBaseEntity = ShipmentService.Models.BaseEntity;

namespace Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<AuthNotification> Notifications { get; set; }
        public DbSet<Setting> Settings { get; set; }
        public DbSet<AuthFile> Files { get; set; }

       
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Inventory> Inventories { get; set; }
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Shipment> Shipments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(AuthBaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(AuthBaseEntity.CreatedAt))
                        .HasDefaultValueSql("GETUTCDATE()");
                    
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(AuthBaseEntity.UpdatedAt))
                        .HasDefaultValueSql("GETUTCDATE()");
                }
            }

            // Unique indekse
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Role>()
                .HasIndex(r => r.Name)
                .IsUnique();

            modelBuilder.Entity<Permission>()
                .HasIndex(p => p.Name)
                .IsUnique();

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.SKU)
                .IsUnique();

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderNumber)
                .IsUnique();

            // Composite unique constraints
            modelBuilder.Entity<UserRole>()
                .HasIndex(ur => new { ur.UserId, ur.RoleId })
                .IsUnique();

            modelBuilder.Entity<RolePermission>()
                .HasIndex(rp => new { rp.RoleId, rp.PermissionId })
                .IsUnique();

           
modelBuilder.Entity<Role>().HasData(
    new Role { Id = 1, Name = "Admin", Description = "Full system access", CreatedBy = 1, UpdatedBy = 1, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
    new Role { Id = 2, Name = "Manager", Description = "Manage operations", CreatedBy = 1, UpdatedBy = 1, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
    new Role { Id = 3, Name = "User", Description = "Regular user", CreatedBy = 1, UpdatedBy = 1, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
);
        }
    }
}