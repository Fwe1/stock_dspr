package com.tea1.stockdspr.domain.stock.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class StockRequestDTO {


//    //로그인 구현 시 삭제
    @NotNull
    private Long facilityId;

    @NotNull
    @PositiveOrZero
    private Integer onHandQty;


    private LocalDate expirationDate;

}
