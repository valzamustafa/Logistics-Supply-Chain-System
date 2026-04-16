using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using AuthService.Data;
using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories.Interfaces;
using AuthService.Services.Interfaces;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IRoleRepository _roleRepository;
        private readonly AuthDbContext _dbContext;

        public AuthController(IAuthService authService, IRoleRepository roleRepository, AuthDbContext dbContext)
        {
            _authService = authService;
            _roleRepository = roleRepository;
            _dbContext = dbContext;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var response = await _authService.RegisterAsync(dto);
            if (response == null)
                return BadRequest(new { message = "User with this email already exists" });

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

        [Authorize(Roles = "Admin")]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(users);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            return Ok(user);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _authService.UpdateUserAsync(id, dto);
            if (user == null)
                return NotFound();
            return Ok(user);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var deleted = await _authService.DeleteUserAsync(id);
            if (!deleted)
                return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{userId}/roles/{roleId}")]
        public async Task<IActionResult> AssignRole(int userId, int roleId)
        {
            var result = await _authService.AssignRoleToUserAsync(userId, roleId);
            if (!result)
                return BadRequest(new { message = "Failed to assign role" });
            return Ok(new { message = "Role assigned successfully" });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{userId}/roles/{roleId}")]
        public async Task<IActionResult> RemoveRole(int userId, int roleId)
        {
            var result = await _authService.RemoveRoleFromUserAsync(userId, roleId);
            if (!result)
                return BadRequest(new { message = "Failed to remove role" });
            return Ok(new { message = "Role removed successfully" });
        }

        [Authorize(Roles = "Admin")]
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

        [Authorize(Roles = "Admin")]
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

        [Authorize]
        [HttpGet("email/{email}")]
        public async Task<IActionResult> GetUserByEmail(string email)
        {
            var user = await _authService.GetUserByEmailAsync(email);
            if (user == null)
                return NotFound();
            return Ok(user);
        }
    }
}
