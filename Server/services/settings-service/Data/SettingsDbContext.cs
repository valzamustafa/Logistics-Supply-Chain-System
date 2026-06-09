using Microsoft.EntityFrameworkCore;
using SettingsService.Models;

namespace SettingsService.Data
{
    public class SettingsDbContext : DbContext
    {
        public SettingsDbContext(DbContextOptions<SettingsDbContext> options) : base(options)
        {
        }

        public DbSet<Setting> Settings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

  
            modelBuilder.Entity<Setting>(entity =>
            {
                entity.ToTable("Settings");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Key)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.Value)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(e => e.Description)
                    .HasMaxLength(500);

                entity.Property(e => e.UpdatedAt)
                    .HasDefaultValue(DateTime.UtcNow);

            
                entity.HasIndex(e => e.Key).IsUnique();
            });

           
            modelBuilder.Entity<Setting>().HasData(
                new Setting { Id = 1, Key = "CompanyName", Value = "Logjistika", Description = "Company name displayed throughout the application", UpdatedAt = DateTime.UtcNow },
                new Setting { Id = 2, Key = "CompanyEmail", Value = "info@logjistika.com", Description = "Company email address for customer support", UpdatedAt = DateTime.UtcNow },
                new Setting { Id = 3, Key = "CompanyPhone", Value = "+1-800-000-0000", Description = "Company phone number for customer inquiries", UpdatedAt = DateTime.UtcNow },
                new Setting { Id = 4, Key = "CompanyAddress", Value = "123 Business St, Suite 100, City, State 12345", Description = "Company physical address", UpdatedAt = DateTime.UtcNow },
                new Setting { Id = 5, Key = "SystemLanguage", Value = "en", Description = "Default system language (en, es, fr, de, etc.)", UpdatedAt = DateTime.UtcNow }
            );
        }
    }
}
