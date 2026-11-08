package com.tea1.stockdspr.domain.reservation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReservationRequestDTO {

    @NotNull
    @Positive
    private Integer quantity;

    //같은 예약을 다시 보냈는지 구분하는 키 (선택)
    @Size(max = 100)
    private String idempotencyKey;
}
