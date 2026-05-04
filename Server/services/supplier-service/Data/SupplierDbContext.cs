using Microsoft.EntityFrameworkCore;
using SupplierService.Models;

namespace SupplierService.Data
{
    public class SupplierDbContext : DbContext
    {
        public SupplierDbContext(DbContextOptions<SupplierDbContext> options) : base(options) { }

        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<SupplierOrder> SupplierOrders { get; set; }
        public DbSet<SupplierOrderItem> SupplierOrderItems { get; set; }
        public DbSet<SupplierProduct> SupplierProducts { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public DbSet<SupplierWarehouseAssignment> SupplierWarehouseAssignments { get; set; }
        public DbSet<SupplierInvitation> SupplierInvitations { get; set; }
        public DbSet<SupplierRequest> SupplierRequests { get; set; }
        public DbSet<EmergencyPurchase> EmergencyPurchases { get; set; }
       public DbSet<Payment> Payments { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Supplier>().HasIndex(s => s.Name).IsUnique();
            modelBuilder.Entity<SupplierOrder>().HasIndex(o => o.OrderNumber).IsUnique();
            modelBuilder.Entity<PurchaseOrder>().HasIndex(po => po.PONumber).IsUnique();
            modelBuilder.Entity<SupplierInvitation>().HasIndex(inv => inv.Token).IsUnique();
        }
    }
}