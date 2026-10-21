package com.tea1.stockdspr.domain.stock.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class StockRequestDTO {


    //로그인 구현 시 삭제
    private Long facilityId;

    @NotEmpty
    private int onHandQty;

    @NotEmpty
    private LocalDate expirationDate;

}
