using System;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Models;
using ProductService.Services.Interfaces;

namespace ProductService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ProductDbContext _dbContext;
        private readonly IWebHostEnvironment _environment;

        public ProductsController(IProductService productService, ProductDbContext dbContext, IWebHostEnvironment environment)
        {
            _productService = productService;
            _dbContext = dbContext;
            _environment = environment;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        {
            var products = await _productService.GetAllProductsAsync();
            if (!includeInactive)
            {
                products = products.Where(p => p.IsActive);
            }

            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _productService.GetProductByIdAsync(id);
            if (product == null)
                return NotFound();
            return Ok(product);
        }

        [HttpGet("sku/{sku}")]
        public async Task<IActionResult> GetBySku(string sku)
        {
            var products = await _productService.GetAllProductsAsync();
            var product = products.FirstOrDefault(p => p.SKU == sku);
            if (product == null)
                return NotFound();
            return Ok(product);
        }

        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var products = await _productService.GetProductsByCategoryAsync(categoryId);
            return Ok(products);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var product = new Product
            {
                Name = dto.Name,
                SKU = dto.SKU,
                Description = dto.Description,
                Price = dto.Price,
                Cost = dto.Cost,
                CategoryId = dto.CategoryId,
                IsActive = dto.IsActive
            };

            try
            {
                var created = await _productService.CreateProductAsync(product);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var product = new Product
            {
                Id = id,
                Name = dto.Name,
                SKU = dto.SKU,
                Description = dto.Description,
                Price = dto.Price,
                Cost = dto.Cost,
                CategoryId = dto.CategoryId,
                IsActive = dto.IsActive
            };

            try
            {
                var updated = await _productService.UpdateProductAsync(product);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _productService.DeleteProductAsync(id);
            if (!deleted)
                return NotFound();
            return NoContent();
        }

        [HttpPost("{id}/images")]
        public async Task<IActionResult> UploadImage(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was provided." });
            }

            var product = await _productService.GetProductByIdAsync(id);
            if (product == null)
                return NotFound();

            var imagesFolder = Path.Combine(_environment.WebRootPath ?? "wwwroot", "images", "products");
            Directory.CreateDirectory(imagesFolder);

            var extension = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(imagesFolder, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var imageUrl = $"/images/products/{fileName}";
            var productImage = new ProductImage
            {
                ProductId = id,
                ImageUrl = imageUrl,
                IsPrimary = true,
                DisplayOrder = 0
            };

            _dbContext.ProductImages.Add(productImage);
            await _dbContext.SaveChangesAsync();

            return Ok(productImage);
        }

        [HttpDelete("{id}/images/{imageId}")]
        public async Task<IActionResult> DeleteImage(int id, int imageId)
        {
            var image = await _dbContext.ProductImages.FirstOrDefaultAsync(pi => pi.Id == imageId && pi.ProductId == id);
            if (image == null)
                return NotFound();

            var imagePath = Path.Combine(_environment.WebRootPath ?? "wwwroot", image.ImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(imagePath))
            {
                System.IO.File.Delete(imagePath);
            }

            _dbContext.ProductImages.Remove(image);
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _productService.GetCategoriesAsync();
            return Ok(categories);
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] Category category)
        {
          
            return BadRequest(new { message = "Category creation is not implemented." });
        }
    }
}
