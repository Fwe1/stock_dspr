package com.tea1.stockdspr.domain.stock.dto;

import java.util.List;

public record StockOverview(int safetyStockQty, long availableQty, List<StockResponseDTO> lots) {}
