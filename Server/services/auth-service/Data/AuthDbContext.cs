using Microsoft.EntityFrameworkCore;
using AuthService.Models;
using BCrypt.Net;

using AuthFile = AuthService.Models.File;

namespace AuthService.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Setting> Settings { get; set; }
        public DbSet<AuthFile> Files { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
            modelBuilder.Entity<Role>().HasIndex(r => r.Name).IsUnique();
            modelBuilder.Entity<Permission>().HasIndex(p => p.Name).IsUnique();

            modelBuilder.Entity<UserRole>()
                .HasIndex(ur => new { ur.UserId, ur.RoleId }).IsUnique();

            modelBuilder.Entity<RolePermission>()
                .HasIndex(rp => new { rp.RoleId, rp.PermissionId }).IsUnique();

            modelBuilder.Entity<Role>().HasData(
                new Role
                {
                    Id = 1,
                    Name = "Admin",
                    Description = "Administrator role for the logistics system",
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Role
                {
                    Id = 2,
                    Name = "Manager",
                    Description = "Manager role for logistics operations",
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Role
                {
                    Id = 3,
                    Name = "Driver",
                    Description = "Driver role for transportation and delivery",
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Role
                {
                    Id = 4,
                    Name = "WarehouseStaff",
                    Description = "Warehouse staff role for inventory and warehouse management",
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Role
                {
                    Id = 5,
                    Name = "User",
                    Description = "General user role for company users",
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            modelBuilder.Entity<User>().HasData(new User
            {
                Id = 1,
                FirstName = "Super",
                LastName = "Admin",
                Email = "admin@logjistika.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                IsActive = true,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            modelBuilder.Entity<UserRole>().HasData(new UserRole
            {
                Id = 1,
                UserId = 1,
                RoleId = 1,
                AssignedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        }
    }
}
