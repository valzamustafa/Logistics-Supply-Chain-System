using OrderService.DTOs;
using OrderService.Models;
using OrderService.Repositories.Interfaces;
using OrderService.Services.Interfaces;
using System.Text.Json;
using iTextSharp.text;
using iTextSharp.text.pdf;
using System.IO;

namespace OrderService.Business
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public OrderService(
            IOrderRepository orderRepository,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _orderRepository = orderRepository;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task<OrderDto?> GetOrderByIdAsync(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            return order == null ? null : MapToDto(order);
        }

        public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync()
        {
            var orders = await _orderRepository.GetAllAsync();
            return orders.Select(MapToDto);
        }

        public async Task<IEnumerable<OrderDto>> GetOrdersByUserAsync(int userId)
        {
            var orders = await _orderRepository.GetByUserAsync(userId);
            return orders.Select(MapToDto);
        }

        public async Task<OrderDto> CreateOrderAsync(CreateOrderRequestDto request)
        {
         
            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            
            foreach (var item in request.Items)
            {
                try
                {
                  
                    var client = _httpClientFactory.CreateClient();
                    var reserveResponse = await client.PostAsJsonAsync(
                        $"{inventoryServiceUrl}/api/inventory/stock",
                        new
                        {
                            ProductId = item.ProductId,
                            WarehouseId = 1,
                            Quantity = item.Quantity,
                            Type = "RESERVE",
                            ReferenceType = "Order",
                            Notes = $"Reserved for order"
                        });

                    if (!reserveResponse.IsSuccessStatusCode)
                    {
                        var errorContent = await reserveResponse.Content.ReadAsStringAsync();
                        throw new InvalidOperationException(
                            $"Failed to reserve stock for product {item.ProductId}: {errorContent}");
                    }
                }
                catch (HttpRequestException ex)
                {
                    throw new InvalidOperationException(
                        $"Inventory service unavailable. Cannot verify stock for product {item.ProductId}. Error: {ex.Message}");
                }
            }

            var order = new Order
            {
                UserId = request.UserId,
                ShippingAddress = request.ShippingAddress,
                BillingAddress = request.BillingAddress,
                CreatedBy = request.UserId,
                UpdatedBy = request.UserId
            };

            decimal totalAmount = 0;
            var orderItems = new List<OrderItem>();

            foreach (var item in request.Items)
            {
                var orderItem = new OrderItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    DiscountPercent = item.DiscountPercent,
                    CreatedBy = request.UserId,
                    UpdatedBy = request.UserId
                };

                var itemTotal = item.Quantity * item.UnitPrice;
                if (item.DiscountPercent.HasValue)
                    itemTotal -= itemTotal * (item.DiscountPercent.Value / 100);

                totalAmount += itemTotal;
                orderItems.Add(orderItem);
            }

            order.TotalAmount = totalAmount;
            order.OrderItems = orderItems;

            var created = await _orderRepository.CreateAsync(order);
            return MapToDto(created);
        }

        public async Task<OrderDto> UpdateOrderStatusAsync(int orderId, string status)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var previousStatus = order.Status;
            order.Status = status;
            
            if (status == "Shipped")
                order.ShippedAt = DateTime.UtcNow;
            else if (status == "Delivered")
                order.DeliveredAt = DateTime.UtcNow;

            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            var client = _httpClientFactory.CreateClient();

            if (status == "Cancelled" && previousStatus != "Cancelled")
            {
                foreach (var item in order.OrderItems ?? new List<OrderItem>())
                {
                    try
                    {
                        await client.PostAsJsonAsync(
                            $"{inventoryServiceUrl}/api/inventory/stock",
                            new
                            {
                                ProductId = item.ProductId,
                                WarehouseId = 1,
                                Quantity = item.Quantity,
                                Type = "RELEASE",
                                ReferenceType = "Order",
                                ReferenceId = orderId,
                                Notes = $"Released due to order cancellation"
                            });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to release stock for product {item.ProductId}: {ex.Message}");
                    }
                }
            }

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

        public async Task<bool> CancelOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null || order.Status != "Pending")
                return false;

            order.Status = "Cancelled";
            await _orderRepository.UpdateAsync(order);
            return true;
        }
        #region Warehouse Selection

   
        public async Task<int> SelectOptimalWarehouseAsync(int orderId, string? customerAddress = null)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var warehouseServiceUrl = _configuration["Services:WarehouseService"] ?? "http://localhost:5006";
            var client = _httpClientFactory.CreateClient();

            // Get all active warehouses
            var warehousesResponse = await client.GetAsync($"{warehouseServiceUrl}/api/warehouses");
            if (!warehousesResponse.IsSuccessStatusCode)
                throw new InvalidOperationException("Failed to retrieve warehouses");

            var warehouses = await warehousesResponse.Content.ReadFromJsonAsync<List<WarehouseDto>>();
            
            if (warehouses == null || !warehouses.Any())
                throw new InvalidOperationException("No warehouses available");

            int bestWarehouseId = 0;
            int maxAvailability = 0;
            decimal minDistance = decimal.MaxValue;

            foreach (var warehouse in warehouses.Where(w => w.IsActive))
            {
                int availableCount = 0;
                
               
                foreach (var item in order.OrderItems ?? new List<OrderItem>())
                {
                    var inventoryResponse = await client.GetAsync(
                        $"{warehouseServiceUrl}/api/warehouses/{warehouse.Id}/inventory/{item.ProductId}");
                    
                    if (inventoryResponse.IsSuccessStatusCode)
                    {
                        var inventory = await inventoryResponse.Content.ReadFromJsonAsync<InventoryCheckDto>();
                        if (inventory != null && inventory.AvailableQuantity >= item.Quantity)
                        {
                            availableCount++;
                        }
                    }
                }

               
                if (availableCount > maxAvailability)
                {
                    maxAvailability = availableCount;
                    bestWarehouseId = warehouse.Id;
                }
                else if (availableCount == maxAvailability && availableCount > 0)
                {
          
                    if (warehouse.Id < bestWarehouseId || bestWarehouseId == 0)
                    {
                        bestWarehouseId = warehouse.Id;
                    }
                }
            }

            if (bestWarehouseId == 0)
                throw new InvalidOperationException("No warehouse has sufficient stock for this order");

            return bestWarehouseId;
        }


        public async Task<OrderDto> AssignWarehouseAsync(int orderId, int warehouseId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

      
            var warehouseServiceUrl = _configuration["Services:WarehouseService"] ?? "http://localhost:5006";
            var client = _httpClientFactory.CreateClient();
            
            var warehouseResponse = await client.GetAsync($"{warehouseServiceUrl}/api/warehouses/{warehouseId}");
            if (!warehouseResponse.IsSuccessStatusCode)
                throw new InvalidOperationException("Invalid warehouse");

            order.WarehouseId = warehouseId;
            order.Status = "Confirmed";
            
            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

        #endregion

        #region Inventory Validation & Deduction


        public async Task<bool> ValidateInventoryAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var warehouseId = order.WarehouseId ?? 1;
            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            var client = _httpClientFactory.CreateClient();

            foreach (var item in order.OrderItems ?? new List<OrderItem>())
            {
                var response = await client.GetAsync(
                    $"{inventoryServiceUrl}/api/inventory/{item.ProductId}/{warehouseId}");
                
                if (!response.IsSuccessStatusCode)
                    return false;

                var inventory = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
                if (inventory == null || !inventory.TryGetValue("quantity", out var qty) || Convert.ToInt32(qty) < item.Quantity)
                    return false;
            }

            return true;
        }

              public async Task<bool> ReserveInventoryAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var warehouseId = order.WarehouseId ?? 1;
            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            var client = _httpClientFactory.CreateClient();

            foreach (var item in order.OrderItems ?? new List<OrderItem>())
            {
                var response = await client.PostAsJsonAsync(
                    $"{inventoryServiceUrl}/api/inventory/reserve",
                    new
                    {
                        ProductId = item.ProductId,
                        WarehouseId = warehouseId,
                        Quantity = item.Quantity,
                        ReferenceType = "Order",
                        ReferenceId = orderId
                    });

                if (!response.IsSuccessStatusCode)
                {
   
                    await ReleaseInventoryAsync(orderId);
                    return false;
                }
            }

            return true;
        }

        public async Task<bool> DeductInventoryAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var warehouseId = order.WarehouseId ?? 1;
            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            var client = _httpClientFactory.CreateClient();

            foreach (var item in order.OrderItems ?? new List<OrderItem>())
            {
                var response = await client.PostAsJsonAsync(
                    $"{inventoryServiceUrl}/api/inventory/deduct",
                    new
                    {
                        ProductId = item.ProductId,
                        WarehouseId = warehouseId,
                        Quantity = item.Quantity,
                        ReferenceType = "Order",
                        ReferenceId = orderId,
                        Notes = $"Inventory deducted for order {order.OrderNumber}"
                    });

                if (!response.IsSuccessStatusCode)
                    return false;
            }

            return true;
        }

    
        public async Task<bool> ReleaseInventoryAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var warehouseId = order.WarehouseId ?? 1;
            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            var client = _httpClientFactory.CreateClient();

            foreach (var item in order.OrderItems ?? new List<OrderItem>())
            {
                try
                {
                    await client.PostAsJsonAsync(
                        $"{inventoryServiceUrl}/api/inventory/release",
                        new
                        {
                            ProductId = item.ProductId,
                            WarehouseId = warehouseId,
                            Quantity = item.Quantity,
                            ReferenceType = "Order",
                            ReferenceId = orderId
                        });
                }
                catch
                {
                
                }
            }

            return true;
        }

        #endregion

        #region Order Processing (Fulfillment)

    
        public async Task<OrderDto> StartProcessingAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            if (order.Status != "Pending" && order.Status != "Confirmed")
                throw new InvalidOperationException($"Cannot start processing for order in status: {order.Status}");

         
            if (!await ValidateInventoryAsync(orderId))
                throw new InvalidOperationException("Insufficient inventory");

            if (!await DeductInventoryAsync(orderId))
                throw new InvalidOperationException("Failed to deduct inventory");

            order.Status = "Processing";
            order.UpdatedAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

     
        public async Task<OrderDto> UpdateProcessingStatusAsync(int orderId, string processingStatus)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            if (order.Status != "Processing")
                throw new InvalidOperationException("Order is not in processing state");

          
            order.Status = processingStatus switch
            {
                "Picking" => "Processing_Picking",
                "Packed" => "Processing_Packed",
                _ => order.Status
            };
            
            order.UpdatedAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

   
        public async Task<OrderDto> CompletePickingAsync(int orderId)
        {
            return await UpdateProcessingStatusAsync(orderId, "Picking");
        }

        
        public async Task<OrderDto> CompletePackingAsync(int orderId)
        {
            return await UpdateProcessingStatusAsync(orderId, "Packed");
        }

        #endregion

        #region Shipment Creation

    
        public async Task<int> CreateShipmentAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            if (order.Status != "Processing_Packed" && order.Status != "Processing")
                throw new InvalidOperationException("Order must be processed before creating shipment");

            var shipmentServiceUrl = _configuration["Services:ShipmentService"] ?? "http://localhost:5004";
            var client = _httpClientFactory.CreateClient();

            var shipmentRequest = new
            {
                OrderId = orderId,
                TrackingNumber = $"TRK-{order.OrderNumber}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                ShippingAddress = order.ShippingAddress?.Split('|').LastOrDefault() ?? order.ShippingAddress,
                EstimatedDeliveryDate = DateTime.UtcNow.AddDays(3),
                Priority = 1,
                Items = order.OrderItems?.Select(i => new
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity
                }).ToList()
            };

            var response = await client.PostAsJsonAsync($"{shipmentServiceUrl}/api/shipments", shipmentRequest);
            
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException("Failed to create shipment");

            var result = await response.Content.ReadFromJsonAsync<ShipmentResponseDto>();
            return result?.Id ?? 0;
        }

    
        public async Task<OrderDto> MarkAsShippedAsync(int orderId, int shipmentId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            order.Status = "Shipped";
            order.ShippedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

        #endregion

        #region Delivery

    
        public async Task<OrderDto> ConfirmDeliveryAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            if (order.Status != "Shipped")
                throw new InvalidOperationException("Order must be shipped before confirming delivery");

            order.Status = "Delivered";
            order.DeliveredAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

     
        public async Task<OrderDto> MarkDeliveryFailedAsync(int orderId, string reason)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            order.Status = "DeliveryFailed";
            order.UpdatedAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

        #endregion

        #region Returns & Adjustments

      
        public async Task<OrderDto> ProcessReturnAsync(int orderId, Dictionary<int, int> returnedItems)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            if (order.Status != "Delivered")
                throw new InvalidOperationException("Only delivered orders can be returned");

            order.Status = "Returned";
            order.UpdatedAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

        public async Task<bool> RestoreInventoryForReturnAsync(int orderId, Dictionary<int, int> returnedItems)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            var warehouseId = order.WarehouseId ?? 1;
            var inventoryServiceUrl = _configuration["Services:InventoryService"] ?? "http://localhost:5003";
            var client = _httpClientFactory.CreateClient();

            foreach (var item in returnedItems)
            {
                var response = await client.PostAsJsonAsync(
                    $"{inventoryServiceUrl}/api/inventory/restore",
                    new
                    {
                        ProductId = item.Key,
                        WarehouseId = warehouseId,
                        Quantity = item.Value,
                        ReferenceType = "OrderReturn",
                        ReferenceId = orderId,
                        Notes = $"Inventory restored from return"
                    });

                if (!response.IsSuccessStatusCode)
                    return false;
            }

            return true;
        }

        #endregion

        #region Workflow Status

   
        public async Task<string> GetOrderWorkflowStatusAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            return order.Status switch
            {
                "Pending" => "Order Created - Awaiting Warehouse Assignment",
                "Confirmed" => "Warehouse Assigned - Awaiting Inventory Validation",
                "Processing" or "Processing_Picking" or "Processing_Packed" => "Processing (Picking/Packing)",
                "Shipped" => "Shipped - In Transit",
                "Delivered" => "Delivered - Complete",
                "Cancelled" => "Cancelled",
                "Returned" => "Returned - Awaiting Inventory Restoration",
                "DeliveryFailed" => "Delivery Failed",
                _ => $"Unknown status: {order.Status}"
            };
        }

        #endregion

        #region Helper Methods

        private int ExtractWarehouseId(string? shippingAddress)
        {
            
            if (string.IsNullOrEmpty(shippingAddress))
                return 1; 

            if (shippingAddress.StartsWith("Warehouse:"))
            {
                var parts = shippingAddress.Split('|');
                if (parts.Length > 0 && int.TryParse(parts[0].Replace("Warehouse:", ""), out int warehouseId))
                    return warehouseId;
            }

            return 1; 
        }

    
        private async Task<int> GetWarehouseIdFromOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            return order?.WarehouseId ?? 1;
        }

        #endregion
        public async Task<byte[]> GenerateInvoicePdfAsync(OrderDto order)
        {
            return await Task.Run(() =>
            {
                using (var ms = new MemoryStream())
                {
                    using (var document = new Document(PageSize.A4, 25, 25, 30, 30))
                    {
                        using (var writer = PdfWriter.GetInstance(document, ms))
                        {
                            document.Open();

                          
                            var titleFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 18);
                            var headerFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 12);
                            var normalFont = FontFactory.GetFont(FontFactory.HELVETICA, 10);
                            var boldFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 10);
                            var smallFont = FontFactory.GetFont(FontFactory.HELVETICA, 8);

                            var companyTable = new PdfPTable(1);
                            companyTable.WidthPercentage = 100;
                            
                            companyTable.AddCell(new PdfPCell(new Phrase("LOGJISTIKA SH.P.K.", titleFont))
                            {
                                HorizontalAlignment = Element.ALIGN_CENTER,
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 5
                            });
                            
                            companyTable.AddCell(new PdfPCell(new Phrase("Rr. Bill Clinton, Prishtinë 10000", normalFont))
                            {
                                HorizontalAlignment = Element.ALIGN_CENTER,
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 3
                            });
                            
                            companyTable.AddCell(new PdfPCell(new Phrase("Tel: +383 49 123 456 | Email: info@logjistika.com", normalFont))
                            {
                                HorizontalAlignment = Element.ALIGN_CENTER,
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 3
                            });
                            
                            companyTable.AddCell(new PdfPCell(new Phrase("NUIS: 81234567 | TVSH: 51234567", smallFont))
                            {
                                HorizontalAlignment = Element.ALIGN_CENTER,
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 10
                            });
                            
                            document.Add(companyTable);

                          
                            var titleTable = new PdfPTable(1);
                            titleTable.WidthPercentage = 100;
                            titleTable.AddCell(new PdfPCell(new Phrase("TAX INVOICE", titleFont))
                            {
                                HorizontalAlignment = Element.ALIGN_CENTER,
                                BackgroundColor = new BaseColor(14, 165, 233),
                                Padding = 10
                            });
                            document.Add(titleTable);
                            
                            document.Add(new Paragraph(" "));

                      
                            var detailsTable = new PdfPTable(2);
                            detailsTable.WidthPercentage = 100;
                            detailsTable.SetWidths(new float[] { 50f, 50f });
                            
                            detailsTable.AddCell(new PdfPCell(new Phrase($"Invoice Number: {order.OrderNumber}", boldFont))
                            {
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 5
                            });
                            detailsTable.AddCell(new PdfPCell(new Phrase($"Customer ID: {order.UserId}", boldFont))
                            {
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 5,
                                HorizontalAlignment = Element.ALIGN_RIGHT
                            });
                            
                            detailsTable.AddCell(new PdfPCell(new Phrase($"Invoice Date: {order.OrderDate:yyyy-MM-dd}", normalFont))
                            {
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 5
                            });
                            detailsTable.AddCell(new PdfPCell(new Phrase($"Order Date: {order.OrderDate:yyyy-MM-dd}", normalFont))
                            {
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 5,
                                HorizontalAlignment = Element.ALIGN_RIGHT
                            });
                            
                            detailsTable.AddCell(new PdfPCell(new Phrase($"Status: {order.Status}", normalFont))
                            {
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 15
                            });
                            detailsTable.AddCell(new PdfPCell(new Phrase("", normalFont))
                            {
                                Border = Rectangle.NO_BORDER,
                                PaddingBottom = 15
                            });
                            
                            document.Add(detailsTable);

                            
                            var itemTable = new PdfPTable(5);
                            itemTable.WidthPercentage = 100;
                            itemTable.SetWidths(new float[] { 40f, 15f, 15f, 15f, 15f });
                            
                            AddTableHeader(itemTable, "Description", headerFont);
                            AddTableHeader(itemTable, "Quantity", headerFont);
                            AddTableHeader(itemTable, "Unit Price", headerFont);
                            AddTableHeader(itemTable, "VAT 18%", headerFont);
                            AddTableHeader(itemTable, "Total", headerFont);
                            
                            decimal subtotal = 0;
                            foreach (var item in order.Items)
                            {
                                var itemTotal = item.UnitPrice * item.Quantity;
                                var vat = itemTotal * 0.18m;
                                subtotal += itemTotal;
                                
                                AddTableItem(itemTable, item.ProductName ?? $"Product {item.ProductId}", normalFont);
                                AddTableItem(itemTable, item.Quantity.ToString(), normalFont, Element.ALIGN_RIGHT);
                                AddTableItem(itemTable, $"€{item.UnitPrice:F2}", normalFont, Element.ALIGN_RIGHT);
                                AddTableItem(itemTable, $"€{vat:F2}", normalFont, Element.ALIGN_RIGHT);
                                AddTableItem(itemTable, $"€{item.TotalPrice:F2}", normalFont, Element.ALIGN_RIGHT);
                            }
                            
                            document.Add(itemTable);
                            document.Add(new Paragraph(" "));

                         
                            var totalTax = subtotal * 0.18m;
                            var grandTotal = subtotal + totalTax;
                            
                            var totalTable = new PdfPTable(2);
                            totalTable.WidthPercentage = 50;
                            totalTable.HorizontalAlignment = Element.ALIGN_RIGHT;
                            totalTable.SetWidths(new float[] { 60f, 40f });
                            
                            AddTotalRow(totalTable, "Subtotal:", $"€{subtotal:F2}", boldFont);
                            AddTotalRow(totalTable, "VAT (18%):", $"€{totalTax:F2}", boldFont);
                            AddTotalRow(totalTable, "TOTAL:", $"€{grandTotal:F2}", titleFont);
                            
                            document.Add(totalTable);
                            document.Add(new Paragraph(" "));

                      
                            var paymentTable = new PdfPTable(1);
                            paymentTable.WidthPercentage = 100;
                            
                            paymentTable.AddCell(new PdfPCell(new Phrase("PAYMENT INFORMATION", headerFont))
                            {
                                BackgroundColor = new BaseColor(240, 248, 255),
                                Padding = 8,
                                HorizontalAlignment = Element.ALIGN_CENTER
                            });
                            
                            paymentTable.AddCell(new PdfPCell(new Phrase(
                                "Bank: Banka Ekonomike\n" +
                                "IBAN: XK05 1234 5678 9012 3456\n" +
                                $"SWIFT: BAKXKS10\n" +
                                $"Reference: Order #{order.OrderNumber}", normalFont))
                            {
                                Padding = 8
                            });
                            
                            document.Add(paymentTable);
                            document.Add(new Paragraph(" "));

                        
                            var footerTable = new PdfPTable(1);
                            footerTable.WidthPercentage = 100;
                            footerTable.AddCell(new PdfPCell(new Phrase("Thank you for your business!", smallFont))
                            {
                                HorizontalAlignment = Element.ALIGN_CENTER,
                                Border = Rectangle.NO_BORDER,
                                PaddingTop = 20
                            });
                            document.Add(footerTable);

                            document.Close();
                        }
                    }
                    
                    return ms.ToArray();
                }
            });
        }

        private void AddTableHeader(PdfPTable table, string text, Font font)
        {
            var cell = new PdfPCell(new Phrase(text, font))
            {
                BackgroundColor = new BaseColor(14, 165, 233),
                HorizontalAlignment = Element.ALIGN_CENTER,
                Padding = 8
            };
            table.AddCell(cell);
        }

        private void AddTableItem(PdfPTable table, string text, Font font, int alignment = Element.ALIGN_LEFT)
        {
            var cell = new PdfPCell(new Phrase(text, font))
            {
                HorizontalAlignment = alignment,
                Padding = 6
            };
            table.AddCell(cell);
        }

        private void AddTotalRow(PdfPTable table, string label, string value, Font font)
        {
            table.AddCell(new PdfPCell(new Phrase(label, font))
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_RIGHT,
                Padding = 5
            });
            
            table.AddCell(new PdfPCell(new Phrase(value, font))
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_RIGHT,
                Padding = 5
            });
        }

        private OrderDto MapToDto(Order order)
        {
            return new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                UserId = order.UserId,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                DiscountAmount = order.DiscountAmount,
                TaxAmount = order.TaxAmount,
                ShippingCost = order.ShippingCost,
                Status = order.Status,
                WarehouseId = order.WarehouseId,
                ProcessingStatus = order.ProcessingStatus,
                ShipmentId = order.ShipmentId,
                ShippingAddress = order.ShippingAddress,
                BillingAddress = order.BillingAddress,
                ShippedAt = order.ShippedAt,
                DeliveredAt = order.DeliveredAt,
                Items = order.OrderItems?.Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    TotalPrice = i.Quantity * i.UnitPrice * (1 - (i.DiscountPercent ?? 0) / 100)
                }).ToList() ?? new()
            };
        }
    }
}