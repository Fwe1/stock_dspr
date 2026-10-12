package com.tea1.stockdspr.domain.stock.dto;

import com.tea1.stockdspr.domain.stock.entity.StockStatus;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class StockUpdateDTO {

    private int onHandQty;

    private LocalDate expirationDate;

    private StockStatus usageStatus;
}
