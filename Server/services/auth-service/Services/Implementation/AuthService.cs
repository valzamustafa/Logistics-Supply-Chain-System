using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AuthService.Data;
using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories.Interfaces;
using AuthService.Services.Interfaces;
using BuildingBlocks;

namespace AuthService.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly AuthDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly INotificationClient _notificationClient;

        public AuthService(
            AuthDbContext context,
            IConfiguration configuration,
            INotificationClient notificationClient)
        {
            _context = context;
            _configuration = configuration;
            _notificationClient = notificationClient;
        }

        public async Task<UserResponseDto> RegisterAsync(RegisterDto registerDto)
        {
         
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == registerDto.Email);
            if (existingUser != null)
                throw new InvalidOperationException("User with this email already exists");

          
            var user = new User
            {
                Email = registerDto.Email,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = 1, // System user
                UpdatedBy = 1
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

        
            var roleName = string.IsNullOrEmpty(registerDto.Role) ? "User" : registerDto.Role;
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null)
            {
                role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "User");
            }

            if (role != null)
            {
                var userRole = new UserRole
                {
                    UserId = user.Id,
                    RoleId = role.Id,
                    AssignedAt = DateTime.UtcNow
                };
                _context.UserRoles.Add(userRole);
                await _context.SaveChangesAsync();
            }

      
            await _notificationClient.SendNotificationAsync(
                user.Id,
                "UserRegistered",
                "Welcome!",
                $"Welcome {user.FirstName} {user.LastName}! Your account has been created successfully.",
                "/dashboard"
            );

            return new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = new List<string> { role?.Name ?? "User" }
            };
        }

        public async Task<LoginResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is disabled");

            
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

          
            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();
            var expiresAt = DateTime.UtcNow.AddDays(7);

            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = HashRefreshToken(refreshToken),
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow
            };
            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            return new LoginResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles
            };
        }

        public async Task<TokenDto> RefreshTokenAsync(RefreshTokenRequestDto request)
        {
            var tokenHash = HashRefreshToken(request.RefreshToken);
            var refreshToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash && !rt.RevokedAt.HasValue);

            if (refreshToken == null || refreshToken.ExpiresAt < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Invalid or expired refresh token");

            var user = refreshToken.User;
            var newToken = GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();
            var newExpiresAt = DateTime.UtcNow.AddDays(7);

        
            refreshToken.RevokedAt = DateTime.UtcNow;

        
            var newRefreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = HashRefreshToken(newRefreshToken),
                ExpiresAt = newExpiresAt,
                CreatedAt = DateTime.UtcNow
            };
            _context.RefreshTokens.Add(newRefreshTokenEntity);
            await _context.SaveChangesAsync();

            var roles = user.UserRoles?.Select(ur => ur.Role?.Name).Where(r => r != null).ToList() ?? new List<string>();

            return new TokenDto
            {
                Token = newToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = newExpiresAt,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles
            };
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
        {
            var users = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .ToListAsync();

            return users.Select(u => new UserResponseDto
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                IsActive = u.IsActive,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            });
        }

        public async Task<UserResponseDto?> GetUserByIdAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return null;

            return new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList()
            };
        }

        public async Task<UserDetailsDto?> GetUserDetailsByIdAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return null;

            return new UserDetailsDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList()
            };
        }

        public async Task<UserResponseDto> UpdateUserAsync(int id, UpdateUserDto updateDto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                throw new InvalidOperationException("User not found");

            user.FirstName = updateDto.FirstName;
            user.LastName = updateDto.LastName;
            user.Email = updateDto.Email;
            user.IsActive = updateDto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var roles = await _context.UserRoles
                .Where(ur => ur.UserId == user.Id)
                .Select(ur => ur.Role.Name)
                .ToListAsync();

            return new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = roles
            };
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Role> CreateRoleAsync(CreateRoleDto createDto)
        {
            var existingRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == createDto.Name);
            if (existingRole != null)
                throw new InvalidOperationException("Role already exists");

            var role = new Role
            {
                Name = createDto.Name,
                Description = createDto.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
            return role;
        }

        public async Task<Role> UpdateRoleAsync(int id, UpdateRoleDto updateDto)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null)
                throw new InvalidOperationException("Role not found");

            role.Name = updateDto.Name;
            role.Description = updateDto.Description;
            role.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return role;
        }

        public async Task<bool> DeleteRoleAsync(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null) return false;

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<Role>> GetAllRolesAsync()
        {
            return await _context.Roles.ToListAsync();
        }

        public async Task<Role?> GetRoleByIdAsync(int id)
        {
            return await _context.Roles.FindAsync(id);
        }

        public async Task AssignRoleAsync(int userId, int roleId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new InvalidOperationException("User not found");

            var role = await _context.Roles.FindAsync(roleId);
            if (role == null)
                throw new InvalidOperationException("Role not found");

            var existing = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);
            
            if (existing != null)
                throw new InvalidOperationException("User already has this role");

            var userRole = new UserRole
            {
                UserId = userId,
                RoleId = roleId,
                AssignedAt = DateTime.UtcNow
            };

            _context.UserRoles.Add(userRole);
            await _context.SaveChangesAsync();

      
            await _notificationClient.SendNotificationAsync(
                userId,
                "RoleAssigned",
                "Role Assigned",
                $"You have been assigned the role: {role.Name}",
                "/profile"
            );
        }

        public async Task RemoveRoleAsync(int userId, int roleId)
        {
            var userRole = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);
            
            if (userRole != null)
            {
                _context.UserRoles.Remove(userRole);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Role>> GetUserRolesAsync(int userId)
        {
            var roles = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.Role)
                .ToListAsync();
            
            return roles;
        }

        public async Task UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsDto permissionsDto)
        {
            var role = await _context.Roles.FindAsync(roleId);
            if (role == null)
                throw new InvalidOperationException("Role not found");

         
            var existingPermissions = _context.RolePermissions.Where(rp => rp.RoleId == roleId);
            _context.RolePermissions.RemoveRange(existingPermissions);

          
            foreach (var permissionName in permissionsDto.Permissions)
            {
                var permission = await _context.Permissions
                    .FirstOrDefaultAsync(p => p.Name == permissionName);
                
                if (permission != null)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = roleId,
                        PermissionId = permission.Id
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Permission>> GetAllPermissionsAsync()
        {
            return await _context.Permissions.ToListAsync();
        }

        public async Task<bool> HasPermissionAsync(int userId, string permission)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return false;

            return user.UserRoles
                .SelectMany(ur => ur.Role.RolePermissions)
                .Any(rp => rp.Permission.Name == permission);
        }

        public async Task LogoutAsync(int userId, string refreshToken)
        {
            var tokenHash = HashRefreshToken(refreshToken);
            var token = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash && rt.UserId == userId);

            if (token != null)
            {
                token.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "YourSuperSecretKeyForAuthService123!";
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "Logjistika";
            var jwtAudience = _configuration["Jwt:Audience"] ?? "LogjistikaClients";
            
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.GivenName, user.FirstName),
                new Claim(ClaimTypes.Surname, user.LastName),
                new Claim("userId", user.Id.ToString())
            };
            
           
            var roles = _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.UserId == user.Id)
                .Select(ur => ur.Role.Name)
                .ToList();
                
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }
            
            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
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

        private string HashRefreshToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }
    }
}