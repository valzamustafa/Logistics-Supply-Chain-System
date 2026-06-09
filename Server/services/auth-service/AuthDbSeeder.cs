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

          
            if (!await context.RolePermissions.AnyAsync())
            {
                var roles = await context.Roles.ToListAsync();
                var permissions = await context.Permissions.ToListAsync();
                var rolePermissions = new List<RolePermission>();

                var adminRole = roles.FirstOrDefault(r => r.Name == "Admin");
                var managerRole = roles.FirstOrDefault(r => r.Name == "Manager");
                var warehouseStaffRole = roles.FirstOrDefault(r => r.Name == "WarehouseStaff");
                var driverRole = roles.FirstOrDefault(r => r.Name == "Driver");
                var supplierRole = roles.FirstOrDefault(r => r.Name == "Supplier");
                var userRole = roles.FirstOrDefault(r => r.Name == "User");


                if (adminRole != null)
                {
                    foreach (var perm in permissions)
                    {
                        rolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionId = perm.Id });
                    }
                }

              
                if (managerRole != null)
                {
                    var managerPerms = permissions.Where(p => 
                        p.Name.StartsWith("manage_") || 
                        p.Name.StartsWith("view_")).ToList();
                    foreach (var perm in managerPerms)
                    {
                        rolePermissions.Add(new RolePermission { RoleId = managerRole.Id, PermissionId = perm.Id });
                    }
                }

                
                if (warehouseStaffRole != null)
                {
                    var warehousePerms = permissions.Where(p => 
                        p.Name.Contains("inventory") || 
                        p.Name.Contains("warehouses")).ToList();
                    foreach (var perm in warehousePerms)
                    {
                        rolePermissions.Add(new RolePermission { RoleId = warehouseStaffRole.Id, PermissionId = perm.Id });
                    }
                }

               
                if (driverRole != null)
                {
                    var driverPerms = permissions.Where(p => p.Name.Contains("shipments")).ToList();
                    foreach (var perm in driverPerms)
                    {
                        rolePermissions.Add(new RolePermission { RoleId = driverRole.Id, PermissionId = perm.Id });
                    }
                }

               
                if (supplierRole != null)
                {
                    var supplierPerms = permissions.Where(p => p.Name.Contains("orders")).ToList();
                    foreach (var perm in supplierPerms)
                    {
                        rolePermissions.Add(new RolePermission { RoleId = supplierRole.Id, PermissionId = perm.Id });
                    }
                }

                if (userRole != null)
                {
                    var userPerms = permissions.Where(p => 
                        p.Name == "view_orders" || 
                        p.Name == "view_inventory").ToList();
                    foreach (var perm in userPerms)
                    {
                        rolePermissions.Add(new RolePermission { RoleId = userRole.Id, PermissionId = perm.Id });
                    }
                }

                await context.RolePermissions.AddRangeAsync(rolePermissions);
                await context.SaveChangesAsync();
            }
        }
    }
}