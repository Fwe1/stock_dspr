package com.tea1.stockdspr.domain.reservation.dto;

import com.tea1.stockdspr.domain.reservation.entity.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter @Builder
public class ReservationResponseDTO {

    private Long id;

    private Long stockId;

    //재고가 있는 지점
    private Long facilityId;

    private Integer quantity;

    private ReservationStatus status;

    private LocalDateTime expiresAt;
}
