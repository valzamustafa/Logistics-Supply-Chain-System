using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories.Interfaces;
using AuthService.Services.Interfaces;

namespace AuthService.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly BuildingBlocks.INotificationClient _notificationClient;

        public AuthService(IUserRepository userRepository, IRoleRepository roleRepository, IUserRoleRepository userRoleRepository, IConfiguration configuration, IHttpClientFactory httpClientFactory, BuildingBlocks.INotificationClient notificationClient)
        {
            _userRepository = userRepository;
            _roleRepository = roleRepository;
            _userRoleRepository = userRoleRepository;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _notificationClient = notificationClient;
        }

        public async Task<UserResponseDto?> RegisterAsync(RegisterDto dto)
        {
            if (await _userRepository.ExistsAsync(dto.Email))
                return null;

            var user = new User
            {
                Email = dto.Email,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                IsActive = true,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            var created = await _userRepository.CreateAsync(user);

          
            string roleName = string.IsNullOrEmpty(dto.Role) ? "User" : dto.Role;
            
            var role = await _roleRepository.GetByNameAsync(roleName);
            if (role == null)
            {
              
                role = new Role 
                { 
                    Name = roleName, 
                    Description = $"{roleName} role",
                    CreatedBy = 1,
                    UpdatedBy = 1
                };
                await _roleRepository.CreateAsync(role);
            }

            await _userRoleRepository.CreateAsync(new UserRole
            {
                UserId = created.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow
            });

            
            if (role.Name == "Supplier")
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.BaseAddress = new Uri(_configuration["Services:SupplierService"] ?? "http://localhost:5000");
                    
                    var createResponse = await client.PostAsJsonAsync("/api/suppliers", new
                    {
                        Name = $"{user.FirstName} {user.LastName}",
                        Email = user.Email,
                        ContactPerson = $"{user.FirstName} {user.LastName}",
                        Phone = string.Empty,
                        Address = string.Empty,
                        IsActive = true
                    });
                    createResponse.EnsureSuccessStatusCode();
                }
                catch
                {
                 
                }
            }

  
            await SendNotificationToRoleAsync("Admin", "UserRegistered",
                "New User Registered",
                $"New user '{created.FirstName} {created.LastName}' ({created.Email}) has been registered with role {roleName}.",
                $"/admin/users/{created.Id}");

          
            await SendNotificationAsync(created.Id, "Welcome",
                "Welcome to Logjistika!",
                $"Welcome {created.FirstName}! Your account has been successfully created.",
                $"/dashboard");

        
            var userWithRoles = await _userRepository.GetUserWithRolesAsync(created.Id);
            return MapToResponse(userWithRoles!);
        }

        public async Task<LoginResponseDto?> LoginAsync(LoginDto dto)
        {
            var user = await _userRepository.GetUserWithRolesAsync(dto.Email);
            if (user == null || !VerifyPassword(dto.Password, user.PasswordHash))
                return null;

            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            var token = GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();
            var expiresAt = DateTime.UtcNow.AddMinutes(60);

            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = BCrypt.Net.BCrypt.HashPassword(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.UpdateAsync(user);

            return new LoginResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = user.UserRoles?.Select(ur => ur.Role.Name).ToList() ?? new()
            };
        }

     
        
        private async Task SendNotificationAsync(int userId, string type, string title, string message, string? actionUrl = null)
        {
            try
            {
                await _notificationClient.SendNotificationAsync(userId, type, title, message, actionUrl);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send notification to user {userId}: {ex.Message}");
            }
        }

        private async Task SendNotificationToRoleAsync(string role, string type, string title, string message, string? actionUrl = null)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(role, type, title, message, actionUrl);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send notification to role {role}: {ex.Message}");
            }
        }

        public async Task<RefreshTokenResponseDto?> RefreshAsync(RefreshTokenRequestDto dto)
        {
            return new RefreshTokenResponseDto
            {
                Token = GenerateAccessToken(null),
                RefreshToken = GenerateRefreshToken(),
                ExpiresAt = DateTime.UtcNow.AddMinutes(60)
            };
        }

        private bool VerifyPassword(string password, string passwordHash)
        {
            if (string.IsNullOrWhiteSpace(passwordHash))
                return false;

            try
            {
                if (BCrypt.Net.BCrypt.Verify(password, passwordHash))
                {
                    return true;
                }
            }
            catch
            {
                
            }

            using var sha256 = SHA256.Create();
            var saltedPassword = "logjistika_salt_" + password;
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(saltedPassword));
            var shaHash = Convert.ToBase64String(hashedBytes);
            return shaHash == passwordHash;
        }

        public async Task<UserResponseDto?> GetUserByIdAsync(int id)
        {
            var user = await _userRepository.GetUserWithRolesAsync(id);
            return user == null ? null : MapToResponse(user);
        }

        public async Task<UserResponseDto?> GetUserByEmailAsync(string email)
        {
            var user = await _userRepository.GetUserWithRolesAsync(email);
            return user == null ? null : MapToResponse(user);
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllAsync();
            var result = new List<UserResponseDto>();
            foreach (var user in users)
            {
                var userWithRoles = await _userRepository.GetUserWithRolesAsync(user.Id);
                result.Add(MapToResponse(userWithRoles!));
            }
            return result;
        }

        public async Task<UserResponseDto?> UpdateUserAsync(int id, UpdateUserDto dto)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return null;

            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.Email = dto.Email;
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            var updated = await _userRepository.UpdateAsync(user);
            return MapToResponse(updated);
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return false;
            await _userRepository.DeleteAsync(id);
            return true;
        }

        public async Task<bool> AssignRoleToUserAsync(int userId, int roleId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (user == null || role == null) return false;

            var existing = await _userRoleRepository.GetByUserAndRoleAsync(userId, roleId);
            if (existing != null) return false;

            await _userRoleRepository.CreateAsync(new UserRole
            {
                UserId = userId,
                RoleId = roleId,
                AssignedAt = DateTime.UtcNow
            });

            if (role.Name == "Supplier")
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("SupplierService");
                    var email = Uri.EscapeDataString(user.Email);
                    var response = await client.GetAsync($"/api/suppliers/email/{email}");

                    if (response.StatusCode == HttpStatusCode.NotFound)
                    {
                        var createResponse = await client.PostAsJsonAsync("/api/suppliers", new
                        {
                            Name = $"{user.FirstName} {user.LastName}",
                            Email = user.Email,
                            ContactPerson = $"{user.FirstName} {user.LastName}",
                            Phone = string.Empty,
                            Address = string.Empty,
                            VatNumber = string.Empty,
                            PaymentTerms = string.Empty,
                            CreditLimit = 0m,
                            IsApproved = false
                        });
                        createResponse.EnsureSuccessStatusCode();
                    }
                    else
                    {
                        response.EnsureSuccessStatusCode();
                    }
                }
                catch
                {
                  
                }
            }


            await SendNotificationAsync(userId, "RoleAssignment",
                $"New Role Assigned: {role.Name}",
                $"You have been assigned the '{role.Name}' role.",
                $"/profile");

     
            await SendNotificationToRoleAsync("Admin", "RoleAssignment",
                "Role Assigned to User",
                $"User '{user.FirstName} {user.LastName}' ({user.Email}) has been assigned the '{role.Name}' role.",
                $"/admin/users/{userId}");

            return true;
        }

        public async Task<bool> RemoveRoleFromUserAsync(int userId, int roleId)
        {
            var userRole = await _userRoleRepository.GetByUserAndRoleAsync(userId, roleId);
            if (userRole == null) return false;
            await _userRoleRepository.DeleteAsync(userRole.Id);
            return true;
        }

     
        
        public async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            var users = await _userRepository.GetAllAsync();
            var userIds = new List<int>();
            
            foreach (var user in users)
            {
                var userWithRoles = await _userRepository.GetUserWithRolesAsync(user.Id);
                if (userWithRoles?.UserRoles?.Any(ur => ur.Role.Name == roleName) == true)
                {
                    userIds.Add(user.Id);
                }
            }
            
            return userIds;
        }

        public async Task<List<int>> GetUserIdsByRolesAsync(List<string> roleNames)
        {
            var users = await _userRepository.GetAllAsync();
            var userIds = new List<int>();
            
            foreach (var user in users)
            {
                var userWithRoles = await _userRepository.GetUserWithRolesAsync(user.Id);
                if (userWithRoles?.UserRoles?.Any(ur => roleNames.Contains(ur.Role.Name)) == true)
                {
                    userIds.Add(user.Id);
                }
            }
            
            return userIds.Distinct().ToList();
        }

        public async Task<UserDetailsDto?> GetUserDetailsByIdAsync(int id)
        {
            var user = await _userRepository.GetUserWithRolesAsync(id);
            if (user == null) return null;
            
            return new UserDetailsDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = user.UserRoles?.Select(ur => ur.Role.Name).ToList() ?? new List<string>()
            };
        }

        public async Task<bool> UserExistsAsync(string email)
        {
            return await _userRepository.ExistsAsync(email);
        }

      
        
        private string GenerateAccessToken(User? user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user?.Id.ToString() ?? ""),
                new Claim(ClaimTypes.Email, user?.Email ?? ""),
                new Claim(ClaimTypes.GivenName, user?.FirstName ?? ""),
                new Claim(ClaimTypes.Surname, user?.LastName ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (user?.UserRoles != null)
            {
                foreach (var userRole in user.UserRoles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, userRole.Role.Name));
                }
            }

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(60),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        private UserResponseDto MapToResponse(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = user.UserRoles?.Select(ur => ur.Role.Name).ToList() ?? new()
            };
        }
    }
}
