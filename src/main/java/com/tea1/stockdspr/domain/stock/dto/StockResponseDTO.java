package com.tea1.stockdspr.domain.stock.dto;

import com.tea1.stockdspr.domain.stock.entity.StockStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockResponseDTO {

    private Long id;

    private Integer onHandQty;

    private Integer reservedQty;

    private LocalDate expirationDate;

    private StockStatus usageStatus; //IN_USE, NOT_IN_USE

}
