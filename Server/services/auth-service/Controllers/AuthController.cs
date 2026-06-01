using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using AuthService.Data;
using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories.Interfaces;
using AuthService.Services.Interfaces;
using BuildingBlocks;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IRoleRepository _roleRepository;
        private readonly AuthDbContext _dbContext;
        private readonly INotificationClient _notificationClient;

        public AuthController(IAuthService authService, IRoleRepository roleRepository, AuthDbContext dbContext, INotificationClient notificationClient)
        {
            _authService = authService;
            _roleRepository = roleRepository;
            _dbContext = dbContext;
            _notificationClient = notificationClient;
        }

        [HttpPost("register")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var response = await _authService.RegisterAsync(dto);
            if (response == null)
                return BadRequest(new { message = "User with this email already exists" });

        
            var fullName = $"{response.FirstName} {response.LastName}";
            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "UserRegistered",
                "New User Registered",
                $"New user '{fullName}' ({response.Email}) has been registered with role {dto.Role}.",
                $"/admin/users"
            );

            return Ok(response);
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var response = await _authService.LoginAsync(dto);
            if (response == null)
                return Unauthorized(new { message = "Invalid email or password" });

            return Ok(response);
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto dto)
        {
            var response = await _authService.RefreshAsync(dto);
            if (response == null)
                return Unauthorized(new { message = "Invalid refresh token" });

            return Ok(response);
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized();

            var userId = int.Parse(userIdClaim.Value);
            var user = await _authService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(users);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            return Ok(user);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _authService.UpdateUserAsync(id, dto);
            if (user == null)
                return NotFound();
            

            var fullName = $"{user.FirstName} {user.LastName}";
            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "UserUpdated",
                "User Profile Updated",
                $"User profile for '{fullName}' (ID: {user.Id}) has been updated.",
                $"/admin/users/{user.Id}"
            );
            
            return Ok(user);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
                
            var deleted = await _authService.DeleteUserAsync(id);
            if (!deleted)
                return NotFound();
            
           
            var fullName = $"{user.FirstName} {user.LastName}";
            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "UserDeleted",
                "User Removed",
                $"User '{fullName}' (ID: {user.Id}) has been removed from the system.",
                $"/admin/users"
            );
            
            return NoContent();
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPost("{userId}/roles/{roleId}")]
        public async Task<IActionResult> AssignRole(int userId, int roleId)
        {
            var user = await _authService.GetUserByIdAsync(userId);
            var role = await _roleRepository.GetByIdAsync(roleId);
            
            if (user == null || role == null)
                return BadRequest(new { message = "User or Role not found" });
                
            var result = await _authService.AssignRoleToUserAsync(userId, roleId);
            if (!result)
                return BadRequest(new { message = "Failed to assign role" });
            
            var userFullName = $"{user.FirstName} {user.LastName}";
            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "RoleAssigned",
                "Role Assigned to User",
                $"Role '{role.Name}' has been assigned to user '{userFullName}'.",
                $"/admin/users/{userId}"
            );
            
            return Ok(new { message = "Role assigned successfully" });
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpDelete("{userId}/roles/{roleId}")]
        public async Task<IActionResult> RemoveRole(int userId, int roleId)
        {
            var user = await _authService.GetUserByIdAsync(userId);
            var role = await _roleRepository.GetByIdAsync(roleId);
            
            if (user == null || role == null)
                return BadRequest(new { message = "User or Role not found" });
                
            var result = await _authService.RemoveRoleFromUserAsync(userId, roleId);
            if (!result)
                return BadRequest(new { message = "Failed to remove role" });
            

            var userFullName = $"{user.FirstName} {user.LastName}";
            await _notificationClient.SendNotificationToRoleAsync(
                "Admin",
                "RoleRemoved",
                "Role Removed from User",
                $"Role '{role.Name}' has been removed from user '{userFullName}'.",
                $"/admin/users/{userId}"
            );
            
            return Ok(new { message = "Role removed successfully" });
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpGet("permissions")]
        public async Task<IActionResult> GetPermissions()
        {
            var permissions = await _dbContext.Permissions.ToListAsync();
            return Ok(permissions);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("roles/{roleId}/permissions")]
        public async Task<IActionResult> UpdateRolePermissions(int roleId, [FromBody] UpdateRolePermissionsDto dto)
        {
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null)
                return NotFound();

            var permissions = await _dbContext.Permissions
                .Where(p => dto.Permissions.Contains(p.Name))
                .ToListAsync();

            var missingPermissions = dto.Permissions.Except(permissions.Select(p => p.Name)).ToList();
            if (missingPermissions.Any())
                return BadRequest(new { message = "Some permissions were not found", missingPermissions });

            var existingRolePermissions = await _dbContext.RolePermissions
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();

            _dbContext.RolePermissions.RemoveRange(existingRolePermissions);
            await _dbContext.SaveChangesAsync();

            var addedPermissions = permissions.Select(p => new RolePermission
            {
                RoleId = roleId,
                PermissionId = p.Id
            });

            _dbContext.RolePermissions.AddRange(addedPermissions);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Permissions updated successfully", permissions = dto.Permissions });
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpGet("roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _roleRepository.GetAllAsync();
            return Ok(roles);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
        {
            var role = new Models.Role
            {
                Name = dto.Name,
                Description = dto.Description,
                CreatedBy = 1,
                UpdatedBy = 1
            };
            var created = await _roleRepository.CreateAsync(role);
            return Ok(created);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("roles/{id}")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return NotFound();
            
            role.Name = dto.Name;
            role.Description = dto.Description;
            role.UpdatedAt = DateTime.UtcNow;
            
            var updated = await _roleRepository.UpdateAsync(role);
            return Ok(updated);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("roles/{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null || role.Name == "Admin") 
                return BadRequest(new { message = "Cannot delete Admin role" });
            
            await _roleRepository.DeleteAsync(id);
            return NoContent();
        }

        
        [AllowAnonymous]
        [HttpGet("users/by-email/{email}")]
        public async Task<IActionResult> GetUserByEmail(string email)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { message = "Email is required" });

            var user = await _dbContext.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            if (user == null)
                return NotFound(new { message = $"User with email '{email}' not found" });

            return Ok(new 
            { 
                Id = user.Id, 
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName
            });
        }

      
        [AllowAnonymous]
        [HttpGet("roles/{roleName}/users")]
        public async Task<IActionResult> GetUsersByRole(string roleName)
        {
            var userIds = await _dbContext.Users
                .Where(u => u.UserRoles.Any(ur => ur.Role.Name == roleName))
                .Select(u => u.Id)
                .ToListAsync();

            return Ok(userIds);
        }

    
        [AllowAnonymous]
        [HttpPost("roles/users/by-roles")]
        public async Task<IActionResult> GetUsersByRoles([FromBody] List<string> roleNames)
        {
            if (roleNames == null || !roleNames.Any())
                return BadRequest(new { message = "At least one role name is required" });

            var userIds = await _dbContext.Users
                .Where(u => u.UserRoles.Any(ur => roleNames.Contains(ur.Role.Name)))
                .Select(u => u.Id)
                .Distinct()
                .ToListAsync();

            return Ok(userIds);
        }

    
        [AllowAnonymous]
        [HttpGet("users/details/{id}")]
        public async Task<IActionResult> GetUserDetailsById(int id)
        {
            var user = await _dbContext.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = $"User with ID '{id}' not found" });

            return Ok(new 
            { 
                Id = user.Id, 
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList()
            });
        }


        [AllowAnonymous]
        [HttpGet("users/exists/{email}")]
        public async Task<IActionResult> UserExists(string email)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { message = "Email is required" });

            var exists = await _dbContext.Users
                .AnyAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            return Ok(new { exists, email });
        }
    }
}