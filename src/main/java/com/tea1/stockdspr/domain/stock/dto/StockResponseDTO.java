package com.tea1.stockdspr.domain.stock.dto;

import com.tea1.stockdspr.domain.stock.entity.StockStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter @Builder
public class StockResponseDTO {

    private Long id;

    private String lotNumber;

    private Integer onHandQty;

    private Integer reservedQty;

    private LocalDate expirationDate;
    private boolean expired;

    private StockStatus usageStatus; //IN_USE, NOT_IN_USE

}
