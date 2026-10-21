package com.tea1.stockdspr.domain.stock.dto;

import com.tea1.stockdspr.domain.stock.entity.StockStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter @Builder
public class StockResponseDTO {

    private Long id;

    private int onHandQty;

    private LocalDate expirationDate;

    private StockStatus usageStatus; //IN_USE, NOT_IN_USE

}
