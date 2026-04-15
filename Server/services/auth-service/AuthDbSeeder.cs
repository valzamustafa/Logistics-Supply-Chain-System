
using AuthService.Data;
using AuthService.Models;
using System.Security.Cryptography;
using System.Text;

namespace AuthService
{
    public class AuthDbSeeder
    {
        public static async Task SeedDataAsync(AuthDbContext context)
        {
          
            if (!context.Roles.Any())
            {
                var roles = new[]
                {
                    new Role { Name = "Admin", Description = "Administrator with full access" },
                    new Role { Name = "Manager", Description = "Manager with operational access" },
                    new Role { Name = "Driver", Description = "Driver for shipment delivery" },
                    new Role { Name = "WarehouseStaff", Description = "Warehouse staff for inventory management" },
                    new Role { Name = "User", Description = "Regular user" }
                };
                
                context.Roles.AddRange(roles);
                await context.SaveChangesAsync();
            }

          
            if (!context.Users.Any())
            {
                var roles = context.Roles.ToList();
                var adminRole = roles.FirstOrDefault(r => r.Name == "Admin");
                var managerRole = roles.FirstOrDefault(r => r.Name == "Manager");
                var driverRole = roles.FirstOrDefault(r => r.Name == "Driver");
                var warehouseRole = roles.FirstOrDefault(r => r.Name == "WarehouseStaff");
                var userRole = roles.FirstOrDefault(r => r.Name == "User");

                var users = new[]
                {
                    // Admin
                    new User
                    {
                        FirstName = "Admin",
                        LastName = "User",
                        Email = "admin@logjistika.com",
                        PasswordHash = HashPassword("Admin123!"),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    // Manager
                    new User
                    {
                        FirstName = "John",
                        LastName = "Manager",
                        Email = "manager@logjistika.com",
                        PasswordHash = HashPassword("Manager123!"),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    // Driver 1
                    new User
                    {
                        FirstName = "Mike",
                        LastName = "Driver",
                        Email = "driver1@logjistika.com",
                        PasswordHash = HashPassword("Driver123!"),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    // Driver 2
                    new User
                    {
                        FirstName = "Sarah",
                        LastName = "Driver",
                        Email = "driver2@logjistika.com",
                        PasswordHash = HashPassword("Driver123!"),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    // Warehouse Staff
                    new User
                    {
                        FirstName = "Robert",
                        LastName = "Warehouse",
                        Email = "warehouse@logjistika.com",
                        PasswordHash = HashPassword("Warehouse123!"),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    // Regular User
                    new User
                    {
                        FirstName = "Jane",
                        LastName = "Customer",
                        Email = "customer@logjistika.com",
                        PasswordHash = HashPassword("Customer123!"),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                context.Users.AddRange(users);
                await context.SaveChangesAsync();

                // Assign Roles
                var createdUsers = context.Users.ToList();
                var userRoles = new List<UserRole>();

                userRoles.Add(new UserRole { UserId = createdUsers[0].Id, RoleId = adminRole?.Id ?? 1 });
                userRoles.Add(new UserRole { UserId = createdUsers[1].Id, RoleId = managerRole?.Id ?? 2 });
                userRoles.Add(new UserRole { UserId = createdUsers[2].Id, RoleId = driverRole?.Id ?? 3 });
                userRoles.Add(new UserRole { UserId = createdUsers[3].Id, RoleId = driverRole?.Id ?? 3 });
                userRoles.Add(new UserRole { UserId = createdUsers[4].Id, RoleId = warehouseRole?.Id ?? 4 });
                userRoles.Add(new UserRole { UserId = createdUsers[5].Id, RoleId = userRole?.Id ?? 5 });

                context.UserRoles.AddRange(userRoles);
                await context.SaveChangesAsync();
            }
        }

        private static string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var saltedPassword = "logjistika_salt_" + password;
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(saltedPassword));
                return Convert.ToBase64String(hashedBytes);
            }
        }
    }
}
