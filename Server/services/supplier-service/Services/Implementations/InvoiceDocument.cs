using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SupplierService.DTOs;

namespace SupplierService.Services.Implementations
{
    public class InvoiceDocument : IDocument
    {
        private readonly PurchaseOrderDto _order;
        private readonly string _supplierName;
        private readonly string _supplierEmail;
        private readonly string _warehouseLabel;

        public InvoiceDocument(PurchaseOrderDto order, string supplierName, string supplierEmail, string warehouseLabel)
        {
            _order = order;
            _supplierName = supplierName;
            _supplierEmail = supplierEmail;
            _warehouseLabel = warehouseLabel;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(11));
                page.PageColor(Colors.White);

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
        }

        public byte[] Generate()
        {
            return Document.Create(Compose).GeneratePdf();
        }

        private void ComposeFooter(IContainer container)
        {
            container.AlignCenter();
            container.Text(x =>
            {
                x.Span("Thank you for your business.").FontSize(9).FontColor(Colors.Grey.Darken1);
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Column(column =>
            {
                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("Invoice").FontSize(26).Bold().FontColor(Colors.Black);
                        col.Item().Text(_order.InvoiceNumber ?? _order.PONumber).FontSize(14).SemiBold().FontColor(Colors.Black);
                    });

                    row.ConstantItem(150).AlignRight().Column(col =>
                    {
                        col.Item().Text("Order Date").SemiBold();
                        col.Item().Text(_order.OrderDate.ToShortDateString());
                        col.Item().PaddingTop(8).Text("Warehouse").SemiBold();
                        col.Item().Text(_warehouseLabel);
                    });
                });

                column.Item().PaddingVertical(20).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.Column(column =>
            {
                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("Supplier").SemiBold();
                        col.Item().Text(_supplierName);
                        col.Item().Text(_supplierEmail).FontColor(Colors.Grey.Darken1);
                    });

                    row.ConstantItem(220).Column(col =>
                    {
                        col.Item().Text("Purchase order").SemiBold();
                        col.Item().Text(_order.PONumber);
                        col.Item().PaddingTop(8).Text("Status").SemiBold();
                        col.Item().Text(_order.Status);
                    });
                });

                column.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                column.Item().PaddingBottom(8).Text("Order Items").FontSize(14).SemiBold();

                column.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(4);
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                    });

                    table.Header(header =>
                    {
                        var descriptionHeader = header.Cell();
                        descriptionHeader.Element(CellStyle);
                        descriptionHeader.Text("Description");

                        var qtyHeader = header.Cell();
                        qtyHeader.Element(CellStyle);
                        qtyHeader.AlignRight();
                        qtyHeader.Text("Qty");

                        var unitHeader = header.Cell();
                        unitHeader.Element(CellStyle);
                        unitHeader.AlignRight();
                        unitHeader.Text("Unit");

                        var totalHeader = header.Cell();
                        totalHeader.Element(CellStyle);
                        totalHeader.AlignRight();
                        totalHeader.Text("Total");
                    });

                    foreach (var item in _order.Items)
                    {
                        var descriptionCell = table.Cell();
                        descriptionCell.Element(CellStyle);
                        descriptionCell.Text(item.ProductId.ToString());

                        var qtyCell = table.Cell();
                        qtyCell.Element(CellStyle);
                        qtyCell.AlignRight();
                        qtyCell.Text(item.Quantity.ToString());

                        var unitCell = table.Cell();
                        unitCell.Element(CellStyle);
                        unitCell.AlignRight();
                        unitCell.Text(item.UnitPrice.ToString("C"));

                        var totalCell = table.Cell();
                        totalCell.Element(CellStyle);
                        totalCell.AlignRight();
                        totalCell.Text(item.TotalPrice.ToString("C"));
                    }

                    table.Footer(footer =>
                    {
                        var labelCell = footer.Cell();
                        labelCell.ColumnSpan(3);
                        labelCell.Column(column =>
                        {
                            column.Item().AlignRight();
                            column.Item().Text(x =>
                            {
                                x.Span("Total Amount").SemiBold();
                            });
                        });

                        var amountCell = footer.Cell();
                        amountCell.AlignRight();
                        amountCell.Text(x =>
                        {
                            x.Span(_order.TotalAmount.ToString("C")).SemiBold();
                        });
                    });
                });

                if (!string.IsNullOrWhiteSpace(_order.Notes))
                {
                    column.Item().PaddingTop(20).Text("Notes").SemiBold();
                    column.Item().Text(_order.Notes ?? string.Empty).FontColor(Colors.Grey.Darken1);
                }
            });
        }

        private static IContainer CellStyle(IContainer container)
        {
            return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5);
        }
    }
}
