package com.tea1.stockdspr.domain.stock.dto;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class StockUpdateDTO {

    @PositiveOrZero
    private Integer onHandQty;

    private LocalDate expirationDate;

}
