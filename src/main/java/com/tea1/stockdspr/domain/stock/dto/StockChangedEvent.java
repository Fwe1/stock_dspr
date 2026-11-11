package com.tea1.stockdspr.domain.stock.dto;

import com.tea1.stockdspr.domain.stock.entity.Stock;
import com.tea1.stockdspr.domain.stock.entity.StockStatus;

//화면에 보이는 이벤트. 엔티티는 그대로 보내지 않음
public record StockChangedEvent(
        Long stockId,
        Long itemId,
        Long facilityId,
        int onHandQty,
        int reservedQty,
        StockStatus usageStatus
) {
    public static StockChangedEvent from(Stock s) {
        return new StockChangedEvent(
                s.getId(),
                s.getItem().getId(),
                s.getFacility().getId(),
                s.getOnHandQty(),
                s.getReservedQty(),
                s.getUsageStatus()
        );
    }
}
