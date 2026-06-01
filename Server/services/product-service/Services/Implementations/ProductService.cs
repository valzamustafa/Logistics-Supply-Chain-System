using System.Linq;
using System.Linq;
using ProductService.Models;
using ProductService.Repositories.Interfaces;
using ProductService.Services.Interfaces;
using BuildingBlocks;

namespace ProductService.Services.Implementations
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        private readonly INotificationClient _notificationClient;

        public ProductService(IProductRepository productRepository, INotificationClient notificationClient)
        {
            _productRepository = productRepository;
            _notificationClient = notificationClient;
        }

        public async Task<Product?> GetProductByIdAsync(int id)
        {
            return await _productRepository.GetByIdAsync(id);
        }

        public async Task<IEnumerable<Product>> GetAllProductsAsync()
        {
            return await _productRepository.GetAllAsync();
        }

        public async Task<IEnumerable<Product>> GetProductsByCategoryAsync(int categoryId)
        {
            return await _productRepository.GetByCategoryAsync(categoryId);
        }

        public async Task<IEnumerable<Category>> GetCategoriesAsync()
        {
            return await _productRepository.GetCategoriesAsync();
        }

        public async Task<Product> CreateProductAsync(Product product)
        {
   
            if (await _productRepository.ExistsAsync(product.SKU))
                throw new InvalidOperationException($"Product with SKU {product.SKU} already exists");

            product.CreatedAt = DateTime.UtcNow;
            product.UpdatedAt = DateTime.UtcNow;
            var created = await _productRepository.CreateAsync(product);

            await SendNotificationToRoleAsync("Admin,Manager,WarehouseStaff", "ProductCreated",
                "New Product Created",
                $"Product '{created.Name}' has been created with SKU {created.SKU}.",
                $"/products/{created.Id}");

            return created;
        }

        public async Task<Product> UpdateProductAsync(Product product)
        {
      
            product.UpdatedAt = DateTime.UtcNow;
            var updated = await _productRepository.UpdateAsync(product);

            await SendNotificationToRoleAsync("Admin,Manager,WarehouseStaff", "ProductUpdated",
                "Product Updated",
                $"Product '{updated.Name}' has been updated.",
                $"/products/{updated.Id}");

            return updated;
        }

        public async Task<bool> DeleteProductAsync(int id)
        {
          

            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return false;

            await _productRepository.DeleteAsync(id);

            await SendNotificationToRoleAsync("Admin,Manager,WarehouseStaff", "ProductDeleted",
                "Product Deleted",
                $"Product '{id}' has been deleted.",
                $"/products");

            await SendNotificationToRoleAsync("Admin,Manager,WarehouseStaff", "ProductDeleted",
                "Product Deleted",
                $"Product '{id}' has been deleted.",
                $"/products");

            await SendNotificationToRoleAsync("Admin,Manager,WarehouseStaff", "ProductDeleted",
                "Product Deleted",
                $"Product '{product.Name}' has been deleted.",
                $"/products");

            return true;
        }


        
        private async Task SendNotificationToRoleAsync(string roles, string type, string title, string message, string? actionUrl = null)
        {
            try
            {
                var roleList = roles.Split(',').Select(r => r.Trim()).Where(r => !string.IsNullOrEmpty(r));
                foreach (var role in roleList)
                {
                    await _notificationClient.SendNotificationToRoleAsync(role, type, title, message, actionUrl);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send product notification to roles {roles}: {ex.Message}");
            }
        }
    }
}