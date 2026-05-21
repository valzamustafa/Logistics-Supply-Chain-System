using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService
{
    public class AuthDbSeeder
    {
        public static async Task SeedDataAsync(AuthDbContext context)
        {
      
            if (!await context.Roles.AnyAsync())
            {
                var roles = new[]
                {
                    new Role { Name = "Admin", Description = "Administrator with full access", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Role { Name = "Manager", Description = "Manager with operational access", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Role { Name = "Driver", Description = "Driver for shipment delivery", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Role { Name = "WarehouseStaff", Description = "Warehouse staff for inventory management", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Role { Name = "Supplier", Description = "Supplier role for vendor dashboard and order management", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Role { Name = "User", Description = "Regular user", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                };
                
                await context.Roles.AddRangeAsync(roles);
                await context.SaveChangesAsync();
            }

    
            if (!await context.Permissions.AnyAsync())
            {
                var permissions = new[]
                {
                    new Permission { Name = "view_users", Description = "Can view users", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "create_users", Description = "Can create users", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "edit_users", Description = "Can edit users", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "delete_users", Description = "Can delete users", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "view_warehouses", Description = "Can view warehouses", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "manage_warehouses", Description = "Can manage warehouses", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "view_inventory", Description = "Can view inventory", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "manage_inventory", Description = "Can manage inventory", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "view_orders", Description = "Can view orders", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "manage_orders", Description = "Can manage orders", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "view_shipments", Description = "Can view shipments", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Permission { Name = "manage_shipments", Description = "Can manage shipments", CreatedBy = 1, UpdatedBy = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                };
                
                await context.Permissions.AddRangeAsync(permissions);
                await context.SaveChangesAsync();
            }
        }
    }
}
